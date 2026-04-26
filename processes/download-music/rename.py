import os

PATH = "./music"

for filename in os.listdir(PATH):
    if not filename.endswith(".mp3"):
        continue

    name, ext = os.path.splitext(filename)

    if "%20" in name:
        name = name.split("%20", 1)[1]

    name = name.replace("%20", "-").lower()
    new_name = name + ext.lower()

    old_path = os.path.join(PATH, filename)
    new_path = os.path.join(PATH, new_name)

    if not os.path.exists(new_path):
        os.rename(old_path, new_path)