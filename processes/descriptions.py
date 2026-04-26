import re

text = '''“key” is the song that sort of introduces you to the album, whereas “door” is a little bit of a small medley that welcomes you to the world of Minecraft.

“Subwoofer Lullaby” is a song I named that way because I always imagine a big speaker somewhere far far in a forest blasting this odd little melody.

“Living Mice,” or the opposite would be deadmau5, hah. Joel did help me a bit with making this album, so there’s that reference.

“Moog City” is a fun track. Moog actually contacted me on it, telling me how much they liked it. I’m glad they never found out I actually didn’t make it with a Moog device. I kinda created this song because I ordered a Moog, but I didn’t have it yet.

“Minecraft” is by far the most minimalist song and also the first song I created for the game. It’s purely pentatonic in scale, builds up very slowly, and then slowly fades away. This is kind of what I built the entire soundtrack around on.

“Oxygène” and “Équinoxe” are naturally references to Jean Michel Jarre.

“Mice on Venus”, or Mouse on Mars. MOM is a definite inspiration for me, and this album directly. It’s a highly experimental German musician duo that has been super active in the late 90’s and early 2000’s and I obsessed over their work. The song started as a piano solo, but as game development went on, I added a kind of, uh, addendum to it. A little cheeky piece that kind of says, Minecraft is also quite silly.

“Thirteen” is a creepy little record you can find in Minecraft. I always wanted the player to find it somewhere deep within a cave, because it’s being played by a device, creating a creepy atmosphere. But it turns out it’s just a creepy song being played. We never actually did that in the game though.

“Excuse” was originally intended to be a song for Minecraft’s hell world, the “Nether”. However when I started creating this album, I wanted it to be more than just carbon copies of what’s in the game. I wanted to give people more. So I ultimately decided that “Excuse” would be one of several exclusive songs only to be found on this record.

“Sweden” is by far the most popular song, and I think it’s because of it’s very minimalistic chord progression that you can follow very easily. It is also based on the principle the song “Minecraft” is built on. Slow buildup, slowly fading away.

“Cat” is a whimsical little track. People seem to like it a lot! I don’t know why!

“Beginning” because the end is always just the beginning. And with Minecraft, now we do know that this is not the last album and there is more to discover. That’s why I named it that.

“Droopy Likes Ricochet” and “Droopy Likes your Face” are both songs from “life changing moments seem minor in pictures”. It’s a song I haven’t created for anything in particular, but the first Droopy song ended up in the first official Minecraft game trailer. I get a lot of questions on what Droopy says. To be fair, I don’t know. It’s a sample library that you receive if you buy Kontakt. As far as I know, it’s a toy you could buy in the 80’s or 90’s which says random phrases about itself.'''

resultados = re.findall(r'“(.*?)”', text)

for item in resultados:
    print(item)