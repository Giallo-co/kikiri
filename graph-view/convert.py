import json

with open('../data/C418.json', 'r', encoding='utf-8') as f:
    music_items = json.load(f)

nodes = []
for item in music_items:
    node = {
        "node_id": item["music_id"],
        "node_name": item["music_name"],
        "node_type": "Music",
        "node_content": json.dumps(item),
        "node_tag_links": [],
        "node_author_links": [],
        "node_album_links": []
    }
    nodes.append(node)

with open('../data/nodes.json', 'w', encoding='utf-8') as f:
    json.dump(nodes, f, indent=4)
