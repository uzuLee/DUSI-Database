#!/usr/bin/env python3
"""
DUSI-NET Flat Manifest Builder v2.0
모든 문서를 data/vault/ 폴더에 평평하게 복사하고 manifest를 생성합니다.
"""

import json
import os
import re
import shutil
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
VAULT_DIR = SCRIPT_DIR / 'data' / 'vault'
MANIFEST_PATH = SCRIPT_DIR / 'data' / 'manifest.json'
SOURCE_ROOT = SCRIPT_DIR.parent

EXCLUDE_DIRS = {'.obsidian', '.trash', '.makemd', '.space', '_viewer', '.claude', '.github'}
EXCLUDE_FILES = {'process_md_files.py', 'old backup.zip'}

def parse_yaml(content):
    meta = {}
    if not content.startswith('---'): return meta
    parts = content.split('---', 2)
    if len(parts) < 3: return meta
    for line in parts[1].strip().split('\n'):
        if ':' in line:
            k, v = line.split(':', 1)
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta

def build_flat_vault():
    if VAULT_DIR.exists(): shutil.rmtree(VAULT_DIR)
    VAULT_DIR.mkdir(parents=True)
    
    file_map = []
    
    # 1. Scan and Copy Files to Flat Vault
    for root, dirs, files in os.walk(SOURCE_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
        for f in files:
            if not f.endswith('.md') or f in EXCLUDE_FILES: continue
            
            src_path = Path(root) / f
            with open(src_path, 'r', encoding='utf-8') as f_obj:
                content = f_obj.read()
                meta = parse_yaml(content)
                
                # Use DUSI ID as flat filename
                dusi_id = meta.get('분류번호', '').split('\n')[0].strip() # Simple extraction
                if not dusi_id or 'DUSI' not in dusi_id:
                    # Fallback to serial in filename
                    match = re.search(r'\d{4}', f)
                    dusi_id = f"REF-{match.group()}" if match else f.replace('.md', '')

                dest_name = f"{dusi_id}.md"
                shutil.copy2(src_path, VAULT_DIR / dest_name)
                
                # Relative path for tree display
                rel_path = os.path.relpath(src_path, SOURCE_ROOT).replace('\\', '/')
                file_map.append({
                    'name': f,
                    'orig_path': rel_path,
                    'vault_id': dusi_id,
                    'meta': meta
                })
    return file_map

def build_tree(file_map):
    # Organize flat map into hierarchical tree for sidebar
    root_nodes = []
    for item in file_map:
        parts = item['orig_path'].split('/')
        current_level = root_nodes
        for i, part in enumerate(parts):
            is_file = (i == len(parts) - 1)
            existing = next((n for n in current_level if n['name'] == part), None)
            
            if not existing:
                new_node = {
                    'name': part,
                    'type': 'file' if is_file else 'folder',
                    'path': item['vault_id'] if is_file else None
                }
                if not is_file: new_node['children'] = []
                else:
                    new_node['meta'] = {
                        'docId': item['meta'].get('문서번호'),
                        'security': item['meta'].get('보안등급'),
                        'date': item['meta'].get('공표일자')
                    }
                current_level.append(new_node)
                current_level = new_node.get('children', [])
            else:
                current_level = existing.get('children', [])
    
    # Sort: Folders first, then by name
    def sort_tree(nodes):
        nodes.sort(key=lambda x: (x['type'] == 'file', x['name']))
        for n in nodes:
            if 'children' in n: sort_tree(n['children'])
            
    sort_tree(root_nodes)
    return root_nodes

def main():
    print("  [DUSI] Starting Flat Build Sync...")
    f_map = build_flat_vault()
    tree = build_tree(f_map)
    
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)
    
    print(f"  [DONE] Vault Synced: {len(f_map)} files flat-indexed.")

if __name__ == '__main__':
    main()
