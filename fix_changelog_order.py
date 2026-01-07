import re

# Read the file
with open(r'c:\Users\Walid\CascadeProjects\mrp\src\app\changelog\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the correct order of versions
version_order = [
    '13.2.1',  # Current v13.1.3
    '13.2.0',  # Current v13.1.0 (Jan 6)
    '13.1.2',  # Keep as is
    '13.1.1',  # Keep as is
    '13.1.0',  # Current v13.0.1 (Dec 28)
    '13.0.0',  # Keep as is
    '12.1.0',  # Move after 12.0.0
    '12.0.0',  # Keep as is
    '11.0.0',  # Keep as is
    '10.1.0',  # Move after 10.0.0
    '10.0.0',  # Keep as is
    '9.1.0',   # Move after 9.0.0
    '9.0.0',   # Keep as is
    '8.1.0',   # Move after 8.0.0
    '8.0.0',   # Keep as is
    '7.4.0',
    '7.3.0',
    '7.2.0',
    '7.1.0',
    '7.0.0',
    '6.0.0',
    '5.0.0',
    '4.0.0',
    '3.1.0',
    '3.0.0',
    '2.0.0',
    '1.0.0',
]

# Extract all version blocks
version_pattern = r'(\{\s*version: \'[\d.]+\',.*?(?=\{\s*version:|$))'
matches = list(re.finditer(version_pattern, content, re.DOTALL))

# Extract the header (before first version)
header_end = matches[0].start()
header = content[:header_end]

# Extract the footer (after last version)
footer_start = matches[-1].end()
footer = content[footer_start:]

# Parse all version blocks into a dictionary
versions_dict = {}
for match in matches:
    block = match.group(1)
    version_match = re.search(r"version: '([\d.]+)'", block)
    if version_match:
        version = version_match.group(1)
        versions_dict[version] = block

# Apply version number changes
if '13.1.3' in versions_dict:
    block = versions_dict['13.1.3']
    block = block.replace("version: '13.1.3'", "version: '13.2.1'")
    versions_dict['13.2.1'] = block
    del versions_dict['13.1.3']

if '13.1.0' in versions_dict:
    block = versions_dict['13.1.0']
    if 'January 6, 2026' in block:
        block = block.replace("version: '13.1.0'", "version: '13.2.0'")
        versions_dict['13.2.0'] = block
        del versions_dict['13.1.0']

if '13.0.1' in versions_dict:
    block = versions_dict['13.0.1']
    block = block.replace("version: '13.0.1'", "version: '13.1.0'")
    versions_dict['13.1.0'] = block
    del versions_dict['13.0.1']

# Rebuild the content in correct order
new_content = header
for i, version in enumerate(version_order):
    if version in versions_dict:
        block = versions_dict[version]
        # Add proper spacing
        if i > 0:
            new_content += '  },\n'
        new_content += block

new_content += footer

# Write the corrected file
with open(r'c:\Users\Walid\CascadeProjects\mrp\src\app\changelog\page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Changelog reordered successfully!")
print(f"Total versions processed: {len(versions_dict)}")
