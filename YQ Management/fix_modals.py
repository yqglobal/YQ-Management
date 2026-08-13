import os
import re

def update_files(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                
                def replace_func(match):
                    line = match.group(0)
                    if 'fixed inset-0' in line:
                        # Clean up any duplicated or messy bg-/backdrop-blur classes
                        # Remove all instances of bg-zinc-950/40, dark:bg-black/60, dark:bg-black/70, bg-black/XX, backdrop-blur-XX
                        
                        line = re.sub(r'bg-black/\d+', '', line)
                        line = re.sub(r'dark:bg-black/\d+', '', line)
                        line = re.sub(r'bg-zinc-950/\d+', '', line)
                        line = re.sub(r'dark:bg-zinc-950/\d+', '', line)
                        line = re.sub(r'backdrop-blur-[a-z0-9\[\]]+', '', line)
                        
                        # Clean up extra spaces
                        line = re.sub(r'\s+', ' ', line)
                        
                        # Add the correct classes back
                        line = line.replace('fixed inset-0', 'fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md')
                        return line
                    return line
                
                new_content = re.sub(r'.*fixed inset-0.*', replace_func, content)
                
                if new_content != content:
                    with open(path, 'w') as f:
                        f.write(new_content)
                    print(f"Fixed {path}")

update_files('frontend/src')
