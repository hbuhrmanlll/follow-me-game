# Playtest checklist

## How to report a problem

On GitHub, open this project, click the **Issues** tab, then **New issue**. Say:
- what device you used (for example "Samsung phone, Chrome")
- what you tapped
- what happened, and what you expected

A screenshot helps a lot. On most Android phones you take one by holding
**Power + Volume Down**.

## Phase 1

- [ ] The game link opens on your phone in Chrome
- [ ] Holding the phone upright shows "Please turn your phone sideways"
- [ ] Sideways, you see the title "Follow Me" over hills, a river and a rising sun
- [ ] The hills slowly drift (the far hills move slower than the near ones)
- [ ] There are no black bars on the left or right
- [ ] **Test Voice** speaks a welcome sentence out loud (check that the volume is up)
- [ ] **Begin** switches to full screen and shows a "Chapter 1 arrives in Phase 2" message
- [ ] The buttons are easy for your kids to tap
- [ ] The link also works on your Windows computer

## Phase 2

Open https://followmegame.netlify.app on your Android phone (Chrome), sideways, volume up.

**Players and saving**
- [ ] **Begin** shows "Who is playing?" with 3 spaces
- [ ] **+ New Player** lets you type a name, then the story starts
- [ ] Make a second player for another child: each one keeps their own place
- [ ] Close Chrome completely mid-scene, reopen the link, pick the player: it continues from the same line
- [ ] **Erase** asks "are you sure?" before deleting a player

**Story and voice**
- [ ] A banner shows "Chapter 1: The Baptism of Jesus / The Jordan River"
- [ ] Every line is read aloud
- [ ] The word being spoken is highlighted in gold as it is read (on some phones the highlight is estimated, so it may run a little ahead or behind; tell me if it's way off)
- [ ] The speaker's name and round portrait always show
- [ ] Bridging lines say **"Narration"** and look slightly different from Scripture lines
- [ ] Scripture lines show their reference at the bottom right (for example "Matthew 3:15 · BSB")
- [ ] The person speaking bobs gently; the voice from heaven brings a soft light down on Jesus

**Buttons along the top**
- [ ] ⟲ replays the current line
- [ ] ⏭ skips to the next line
- [ ] 🚶 changes speed: 🐢 slow, 🚶 normal, 🐇 fast
- [ ] **Auto** / **Tap**: in Tap mode the game waits for you to tap the box ("Tap to continue ▶")
- [ ] 📜 opens the full passage; **BSB** / **KJV** switches the translation, and the story then uses it
- [ ] ☰ goes back to "Who is playing?"

**Puzzles**
- [ ] The question is read aloud; 🔊 reads it again
- [ ] A wrong answer turns grey and gives a gentle hint with the verse reference
- [ ] The right answer turns green, says "That's right!", and shows **Continue**

**Chapter end**
- [ ] Shows "Chapter 1 complete!", the memory verse (Matthew 3:17) and a Reflect thought, all read aloud

**Questions for you and the kids**
- Was any text too small or too long to read comfortably?
- Is the normal speed right for your youngest?
- Did the kids want to tap the box to move on, or were they happy with Auto?

## Phase 3

The title screen should say **Phase 3 · v0.3.0** in the bottom-left corner.
Your saved players keep their place. A player who already finished Chapter 1 continues into Chapter 2.

**Chapter 2: Tempted in the Wilderness**
- [ ] The wilderness looks dry and rocky; the second scene shows Jerusalem with the temple
- [ ] When the tempter speaks there is no figure, just a round "?" portrait and the screen dims a little (check it isn't scary for your youngest)
- [ ] Jesus answers each time with "It is written…" and the reference shows (Matthew 4:4, 4:7, 4:10)
- [ ] A **ⓘ Note** before the temple scene explains that Luke lists the temptations in a different order, and is read aloud
- [ ] **Fill in the missing word:** the verse shows a blank; a wrong word turns grey with a hint; the right word fills in and the whole verse is read
- [ ] **Find on the map:** tapping a wrong dot names it ("That's Nazareth"); tapping Jerusalem turns it green

**Chapter 3: The First Disciples**
- [ ] A note explains why John's "Lamb of God" words come after the temptation
- [ ] "✦ Andrew is now following Jesus! ✦" appears and is read aloud, and so on for Peter, Philip and Nathanael
- [ ] Disciples who have joined keep walking with Jesus in the scenes after
- [ ] In the last scene Jesus says **"Follow Me."** (John 1:43), the line the game is named after
- [ ] The Bethsaida map puzzle: you can drag the map up and down

**The map (🗺 button, top right, and on the chapter-end screen)**
- [ ] Shows a gold dashed route: Jordan → Wilderness → Jerusalem → Wilderness → Jordan → Galilee
- [ ] The place you are now is gold; places already visited are red
- [ ] Tapping a visited place shows and reads its summary
- [ ] Dragging moves the map up and down
- [ ] **←** returns you to the story (it replays the line you were on)

**Questions for you and the kids**
- Can the kids find places on the map without help? Are the dots big enough?
- Are the notes helpful, or too long for the kids? (They're mostly for parents.)
- With 5 people on screen in Chapter 3, is it still clear who is talking?

## Phase 4

The title screen should say **Phase 4 · v0.4.0**. Existing players keep their place, and start on the **Family** level.

**Levels**
- [ ] Making a new player asks "Who is this player?": Kids, Family or Adult
- [ ] Under each player is a level button (for example "Family"). Tap it to change level
- [ ] **Kids:** answers show pictures. Tapping an answer once reads it out loud, and tapping it again chooses it. There are fewer choices
- [ ] **Kids:** the memory verse is a short part of the verse (for example "Look, the Lamb of God")
- [ ] **Adult:** verses are cut into more pieces in "put the verse in order"

**New puzzles** (all in Chapters 1–3)
- [ ] Chapter 1, scene 2: **Who said it?** Tap a person, then their words
- [ ] Chapter 2, scene 2: **Put Jesus' words back in order.** The verse builds up at the top
- [ ] Chapter 2, scene 3: **Put the temptations in order.** Each card gets a number. After two misses, the right card glows
- [ ] Chapter 3, scene 3: **Find Nathanael under the fig tree.** Wrong places say "Not here"
- [ ] Chapter 3, new scene 4: **Match each disciple to a fact**
- [ ] (A "count the loaves and fish" puzzle is built and will appear in Chapter 14)

**☰ Menu** (top-left during the story)
- [ ] Continue, Map, Verse Journal, The Twelve, Change Player all work

**Verse Journal**
- [ ] After a chapter, its memory verse is in the Journal. Verses from puzzles are added too
- [ ] Tapping a verse reads it aloud
- [ ] **Practice** gives quick puzzles for the verses that are due
- [ ] Stars (★☆☆☆☆): getting a verse right the first time adds a star, and it comes back later (1, 3, 7, then 14 days). A miss starts it over at one star, to practice again soon

**The Twelve (Disciple Cards)**
- [ ] 12 cards: the ones you have met show color and a symbol; the rest say "Not met yet"
- [ ] Tapping a card shows and reads his name, hometown, work, and facts with verse references
- [ ] Nathanael's card has an ⓘ note that "Bartholomew" is tradition, not stated in the Bible
- [ ] Cards don't give away later events. They say "More about him later in the story…"

**Questions for you and the kids**
- Does "tap once to hear, tap again to choose" make sense to your youngest?
- Are any of the new puzzles confusing or too hard? Which ones do the kids like best?
- Is anything on the Disciple Cards worded in a way you'd change?

## Phase 5, part 1: Chapters 4–10

The title screen should say **Phase 5 · v0.5.0**.

**Quick way to reach a chapter:** a player who already finished Chapter 3 continues straight into Chapter 4.

- [ ] **Ch 4, The Wedding at Cana:** Mary, the servants and the master of the banquet; count the 6 stone jars
- [ ] **Ch 5, Born Again and Living Water:** Jesus clears the temple (with a note that this happened twice); Nicodemus at night under the stars; the woman at the well. The disciples are *not* on screen with Nicodemus or at the well (John 4:8 says they had gone into town)
- [ ] **Ch 6, Rejected at Nazareth:** Jesus reads Isaiah in the synagogue; the crowd's anger is told calmly; find Nazareth on the map
- [ ] **Ch 7, Fishers of Men:** the boats and the huge catch; James and John join; put Jesus' day in Capernaum in order
- [ ] **Ch 8, Jesus Calls Matthew:** Matthew joins at the tax booth
- [ ] **Ch 9, Choosing the Twelve:** after a night of prayer, the other five join, so the Twelve are complete (check "The Twelve" in the ☰ menu shows 12/12); count the apostles
- [ ] **Ch 10, The Sermon on the Mount:** the Beatitudes, the light of the world (find the lamp hidden under the basket), the Lord's Prayer, the wise and foolish builders
- [ ] At the end of each chapter, **💬 Talk Together** shows 2–3 questions and a short prayer; 🔊 reads the questions, 🙏 reads the prayer
- [ ] Disciples who aren't speaking stand in a smaller back row without names

**Questions for you**
- Are the discussion questions the right level for your kids?
- Is any wording in the narration lines you'd change? (They're marked "Narration" in the game and are in `content/en/chapters/`.)
- Does Chapter 10 (4 scenes) feel too long for one sitting?

## Phase 5, part 2: Chapters 11–19

- [ ] **Ch 11, Even the Wind and the Sea Obey Him:** a storm at night (rain, lightning, people swaying); Jesus says "Be still!"; the healed man tells the Decapolis. Check the storm and the evil-spirit part aren't too scary for your youngest
- [ ] **Ch 12, Do Not Be Afraid; Just Believe:** the woman touches Jesus' cloak; only Peter, James and John go into Jairus' house; "Talitha koum!"
- [ ] **Ch 13, Sending Out the Twelve:** "Freely you have received; freely give"; count the two sparrows
- [ ] **Ch 14, Bread and Steps on the Sea:** count the 5 loaves and 2 fish; Peter walks on the water in a storm; "I am the bread of life"
- [ ] **Ch 15, You Are the Christ:** the rock cliff at Caesarea Philippi; find it far in the north on the map
- [ ] **Ch 16, The Transfiguration:** Jesus shines white beside Moses and Elijah; the note says the mountain isn't named
- [ ] **Ch 17, Mary and Martha:** a short chapter, one scene
- [ ] **Ch 18, Raising Lazarus:** "I am the resurrection and the life"; "Jesus wept"; Lazarus comes out. Check it feels hopeful rather than sad or scary
- [ ] **Ch 19, Zacchaeus:** find Zacchaeus hiding in the sycamore tree; find Jericho on the map

**Questions for you**
- Was anything too frightening for little ones (the storm, the evil spirits, Lazarus' tomb)?
- Chapter 17 is short (one scene) and Chapter 18 is longer (three). Is that balance OK?

## Phase 5, part 3: Chapters 20–28 and the ending

**Please play Chapters 21–25 yourself first, before your kids do.** They cover the betrayal, Peter's denial, the crucifixion and the resurrection.

- [ ] **Ch 20, The King Comes to Jerusalem:** the donkey and "Hosanna!"; the temple clearing (with a note that Mark puts it the next day)
- [ ] **Ch 21, The Last Supper:** Jesus washes feet; Judas "went out into the night" and leaves the group (he doesn't appear with the disciples after this); the new commandment; the bread and the cup
- [ ] **Ch 22, Gethsemane:** "Not as I will, but as You will"; the arrest; Jesus heals the servant's ear
- [ ] **Ch 23, Trials and Peter's Denial:** the rooster crows; Pilate: "What is truth?"
- [ ] **Ch 24, The Cross:** a parent note at the start; three small crosses on a dark hill, no figures on them, nothing graphic; "Father, forgive them," "It is finished," and the centurion's words; ends with hope: "this was not the end of the story"
- [ ] **Ch 25, He Is Risen!:** the stone rolled away with light coming out; Jesus says "Mary."
- [ ] **Ch 26, Emmaus and Thomas:** recognized in the breaking of bread; "My Lord and my God!"
- [ ] **Ch 27, Breakfast on the Shore:** the net on the right side; 153 fish; "Do you love Me?" three times
- [ ] **Ch 28, Go and Make Disciples:** the Great Commission; Jesus rises into a cloud
- [ ] **✝ The Good News:** after Chapter 28, five short slides with verses, then an invitation to talk with a parent or pastor, and a prayer. **Walk the Journey Again** restarts the story but keeps the Verse Journal and Disciple Cards

**Questions for you**
- Is Chapter 24 right for your youngest? Too much, too little, or about right?
- Is the wording of The Good News the way you'd explain it to your kids? (It's in `content/en/ending.json`, so you or your pastor can change it.)
- Judas: Chapter 23 includes his remorse (Matthew 27:3-4) but not how he died (27:5). Is that the right choice for your family?

## Phase 6, part A: settings, parents, progress, offline

The title screen should say **Phase 6A · v0.6.0**. It has two new buttons at the top right: **⚙** (Settings) and **👪** (Parents).

**Settings (⚙ on the title screen, or ☰ → Settings during the story)**
- [ ] Voices slider changes how loud the voice is (🔊 Test plays a sample)
- [ ] Text size: Normal / Large / Extra large changes the dialogue words
- [ ] High contrast: white box, black words, bright yellow highlight
- [ ] Show words (subtitles) Off: the voice still reads, and the box shows 🔊 … instead of the words
- [ ] Move on by itself, and speaking speed, work like the buttons in the story
- [ ] (Music and sound effects sliders are ready for Phase 6B)

**Parent check**
- [ ] 👪 asks a grown-up to **press and hold for 3 seconds**; a quick tap doesn't open it
- [ ] Changing a player's level or erasing a player now also asks for the 3-second hold

**Parents & Leaders**
- [ ] **Leader Mode:** pick any chapter and scene; it plays with a "🎓 Leader Mode" badge; nothing is saved and no player's progress changes; ☰ returns to the Parents screen
- [ ] **Printable Chapter Summary:** opens a page with the memory verse, scenes, discussion questions (with lines to write on) and the prayer. Use **Print / Save as PDF**. On Android, choose "Save as PDF" as the printer
- [ ] Privacy note: no ads, purchases, accounts or tracking; everything stays on the device

**My Progress (☰ → My Progress)**
- [ ] Shows chapters done, verses known, disciples met and scroll pieces found
- [ ] Each scene has a hidden 📜 **scroll piece** somewhere on the screen. Tapping it says "You found a scroll piece!" and uncovers one square of the journey map picture
- [ ] **Achievements:** earned ones show their icon, locked ones show 🔒. Tap one to hear what it's for. New ones are announced with 🏆

**Offline**
- [ ] In Chrome, ⋮ → **Add to Home screen** (or **Install app**) gives a "Follow Me" icon
- [ ] Open it once with internet, then turn on airplane mode and open it again: it still works

**Questions for you**
- Are the scroll pieces too easy or too hard to spot?
- Is the 3-second hold a good parent check, or would you prefer a simple math question?

## Phase 6, part B: music, sound effects, cutscenes and finished art

The title screen should say **Phase 6B · v0.6.5**. Turn your phone's sound up.
The music starts after your first tap, because phones don't allow sound before that.

**Music and sound**
- [ ] Gentle music plays on the title screen and changes with each scene: brighter at
      midday, quieter at night, stormy on the sea, solemn at the cross, joyful at the empty tomb
- [ ] The music gets quieter while someone is speaking, then comes back up
- [ ] Buttons make a soft click
- [ ] A right puzzle answer plays a bright chime, and a wrong one plays a soft, gentle tone (not a harsh buzz)
- [ ] Finding a scroll piece, a disciple joining, and a new achievement each have their own sound
- [ ] ⚙ Settings: the **Music** and **Sound effects** sliders change the volume straight away. All the way left turns them off

**Cutscenes** (each one is short, has no words, shows the Bible reference in the corner, and has a **Skip ⏭** button)
- [ ] Chapter 1, "Jesus Comes to the Jordan": Jesus comes up out of the water, the clouds part, light shines down, and a dove descends
- [ ] Chapter 11, "Peace, Be Still": a fierce storm with thunder and a tossing boat. Later, Jesus stands, the waves settle, the clouds clear and the moon comes out
- [ ] After the calm, the rain on the stage stops too (also if you leave and come back)
- [ ] Chapter 16, "His Face Shone Like the Sun": light grows around Jesus, His clothes turn white, Moses and Elijah appear, and a bright cloud covers them
- [ ] Chapter 25, "The Stone Is Rolled Away": dawn breaks, there is an earthquake, an angel comes down, the stone rolls away, and the empty grave clothes are seen inside
- [ ] Chapter 28, "Taken Up into Heaven": the disciples watch Jesus rise into the light, a cloud hides Him, and two men in white appear
- [ ] Tip: in 👪 Parents → **Leader Mode**, you can jump straight to any of these scenes

**Finished art (when you're ready)**
- [ ] Follow **ART_GUIDE.md** to make one background, for example `jordan.jpg`, and upload it. A few minutes later, the title screen and Chapter 1 show your picture instead of the drawn hills

**Questions for you**
- Is the music the right volume, and does it suit the game? Should it be quieter by default?
- Are the cutscenes the right length (about 8–11 seconds)?
- Would you like a setting to turn cutscenes off, or is the Skip button enough?

## Phase 7, part A: the Android app

Install the test app by following **ANDROID.md** (it takes about 2 minutes). The title
screen should say **Phase 7 · v0.7.0**.

**Installing**
- [ ] The link downloads `follow-me-test.apk`, and it installs after you allow it
- [ ] The app drawer shows **Follow Me (test)** with the sunrise icon
- [ ] Opening it shows a dark start-up screen with the icon, then the title screen

**Playing**
- [ ] It's landscape and fills the whole screen, with no phone bars at the top or bottom
- [ ] The **voice reads every line**. It may sound different from the website, because it's the
      phone's own voice
- [ ] Words light up as they're spoken. If the phone's voice doesn't report its position, the
      highlight follows an estimate instead, which is fine
- [ ] Music and sound effects play
- [ ] **Back button**: opens the menu during the story, returns to the title screen elsewhere, and closes the game on the title screen
- [ ] Press the Home button in the middle of a line: the voice stops. Come back: the line is read again
- [ ] The screen doesn't turn off while a chapter plays by itself
- [ ] Turn on **airplane mode**: everything still works, including the Scripture panel (📜)
- [ ] Close the app completely and reopen it: **Continue** resumes exactly where you were

**Updating**
- [ ] After the next update, install the new test app over the old one: your players and progress are still there

**Questions for you**
- Is the phone's voice OK for now (until the recorded voices come)?
- What contact email should the privacy policy and Play Store listing show?

## Phase 7, part A2: real-looking people and richer scenes

The title screen should say **Phase 7 · v0.7.2** (or later). Check it on the website or in the test app (ANDROID.md).

**People**
- [ ] Everyone has a face, hair, a beard where it fits, and the right clothes: robes with a mantle and tassels for the disciples, head coverings for the women, John's camel-hair garment, Caiaphas's turban and breastpiece, Pilate's toga, and the centurion's helmet and armor
- [ ] People breathe and blink, and look toward whoever is speaking
- [ ] The speaker's mouth moves, and they nod and lift a hand now and then
- [ ] The round picture in the dialogue box shows the speaker's face
- [ ] Groups ("The disciples", "The people", "The Pharisees", "Two men dressed in white") stand as a small group
- [ ] New disciples **walk in** from the side when they start following Jesus (Chapters 3, 7, 8 and 9)
- [ ] At the Last Supper (Chapter 21), Judas **walks away** and fades into the night
- [ ] At the Transfiguration (Chapter 16), Jesus' clothes shine white; Moses and Elijah glow softly
- [ ] The cutscenes use the same people

**Scenes**
- [ ] Soft clouds drift across the sky, and the sun or moon glows
- [ ] Hills have olive trees, cypresses, grass and wildflowers, with distant hills fading into the haze
- [ ] Villages have stone houses with roof beams, doorways, outside stairs and clay jars, and there's a date palm
- [ ] Jerusalem has walls with towers and a gleaming white-and-gold Temple
- [ ] The game feels at least as smooth as before on your phone

## Phase 7, part A3: free AI voices

The title screen should say **Phase 7 · v0.7.3**. Use the GitHub link: https://hbuhrmanlll.github.io/follow-me-game/

- [ ] Every story line is spoken by a natural-sounding AI voice (Kokoro), not the robot voice
- [ ] Characters sound different: the narrator, Jesus, John the Baptist, Peter, Mary, Pilate and others
- [ ] Words light up roughly in time with the voice
- [ ] The 🐢 / 🚶 / 🐇 speed button still slows down or speeds up the voice
- [ ] Short pop-ups and puzzle questions are still read by the phone's own voice (that's expected)

**Questions for you**
- Does any character's voice sound wrong for them? Tell me which, and I'll change it in a minute.

## Version 0.8: more fun, more life, better voices

The title screen should say **Phase 7 · v0.8.0**. Play at https://hbuhrmanlll.github.io/follow-me-game/ or in the test app.

**Voices**
- [ ] Puzzle questions, answer choices, hints, "That's right!" and other messages are read by a natural AI voice (not the robot voice)
- [ ] The voice from heaven (Chapters 1 and 16) is deep, with a gentle echo
- [ ] The tempter in Chapter 2 is now named **Satan**

**Fun**
- [ ] After each puzzle, everyone on stage jumps and cheers, with confetti and "⭐ Well done!"
- [ ] Answer several puzzles right the first time in a row: "🔥 3 in a row!" (a wrong answer starts the count again)
- [ ] When someone gets something wrong, the people on stage scratch their chins
- [ ] At sad moments (the cross, the burial) there's only a quiet ⭐, with no cheering
- [ ] At the end of each chapter, 1 to 3 stars drop in (3 = no wrong answers), with confetti for a perfect chapter
- [ ] People react to the story: amazed at miracles, cheering when people rejoice

**Life in the scenes**
- [ ] Birds fly across the sky, butterflies flutter, sheep graze on Galilee's hills, the water sparkles, and fireflies and twinkling stars come out at night

**Mini-games** (Leader Mode can jump straight to each)
- [ ] Chapter 7, scene 1: tap the jumping fish to fill Simon's net until it starts to tear
- [ ] Chapter 14, scene 1: gather the leftover bread and fish into twelve baskets
- [ ] Chapter 19, scene 1: tap the glowing branches to help Zacchaeus climb the sycamore, and then Jesus walks up
- [ ] Chapter 20, scene 1: spread cloaks and palm branches on the road as Jesus rides the donkey and the crowd cheers

**Faces**
- [ ] Bigger eyes with color and a sparkle, rosy cheeks, and lips
