import os
import re

def update_files(directory):
    count = 0
    pattern = re.compile(r'bg-black/\d+(?:\s+dark:bg-black/\d+)?\s+backdrop-blur-(?:sm|md|lg|none|\[1px\])?')
    replacement = 'bg-zinc-950/50 dark:bg-zinc-950/80 backdrop-blur-md'
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                
                # Also replace plain bg-black/50 if backdrop-blur is missing but it's part of fixed inset-0
                # Let's use a targeted approach for fixed inset-0
                
                def replace_func(match):
                    line = match.group(0)
                    if 'fixed inset-0' in line:
                        line = re.sub(r'bg-black/\d+', 'bg-zinc-950/40 dark:bg-black/60', line)
                        if 'backdrop-blur-' in line:
                            line = re.sub(r'backdrop-blur-[a-z0-9\[\]]+', 'backdrop-blur-md', line)
                        else:
                            line = line.replace('bg-zinc-950/40', 'bg-zinc-950/40 backdrop-blur-md')
                        return line
                    return line
                
                # Match lines containing 'fixed inset-0'
                new_content = re.sub(r'.*fixed inset-0.*', replace_func, content)
                
                if new_content != content:
                    with open(path, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {path}")
                    count += 1
    print(f"Total files updated: {count}")

update_files('frontend/src')
