import asyncio
import os
import os.path
import random
import re
import urllib.request
import datetime
from random import randint
import discord
import requests
from discord.utils import get
from discord.ext import commands
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json
import sqlite3
import uuid
import linecache
import sys
from bs4 import BeautifulSoup
import pickle
import html
from pathlib import Path
home = str(Path.home())

db = sqlite3.connect('Master.db')
cursor = db.cursor()

cursor.execute("""
    CREATE TABLE IF NOT EXISTS `fluffster_wishlist` (
    	`id`	INTEGER PRIMARY KEY AUTOINCREMENT,
    	`uuid`	TEXT,
    	`author`	INTEGER,
        `datetime`  TEXT,
        `item`  TEXT
    );
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS `fluffster_ticket` (
    	`id`	INTEGER PRIMARY KEY AUTOINCREMENT,
    	`guildname`	INTEGER,
    	`by`	INTEGER,
        `date`  TEXT,
        `issue`  TEXT
    );
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS `fluffster_token` (
    	`id`	INTEGER PRIMARY KEY AUTOINCREMENT,
    	`uuid`	TEXT,
        `name`  TEXT,
        `expires`  TEXT
    );
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS `fluffster_command` (
    	`id`	INTEGER PRIMARY KEY AUTOINCREMENT,
    	`name`	TEXT,
        `dir`  TEXT,
        `uses`  INTEGER
    );
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS `fluffster_logs` (
    	`id`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
    	`guildid`	INTEGER,
    	`guildname`	TEXT,
    	`channelid`	INTEGER,
    	`channelname`	TEXT,
    	`userid`	INTEGER,
    	`username`	TEXT,
    	`usermsg`	BLOB,
    	`messageid`	INTEGER,
    	`attachments` BLOB,
    	`datetime`	TEXT,
        `deleted` INTEGER
);""")
db.commit()

def PrintException():
    exc_type, exc_obj, tb = sys.exc_info()
    f = tb.tb_frame
    lineno = tb.tb_lineno
    filename = f.f_code.co_filename
    linecache.checkcache(filename)
    line = linecache.getline(filename, lineno, f.f_globals)
    print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_type + " " + exc_obj))


async def DiscordPrintException(message):
    exc_type, exc_obj, tb = sys.exc_info()
    f = tb.tb_frame
    lineno = tb.tb_lineno
    filename = f.f_code.co_filename
    linecache.checkcache(filename)
    line = linecache.getline(filename, lineno, f.f_globals)
    await message.channel.send('```\nEXCEPTION IN ({}, LINE {} "{}"): {}```'.format(filename, lineno, line.strip(), exc_type + " " + exc_obj))


def py_mail(SUBJECT, BODY):
    """With this function we send out our html email"""

    # Create message container - the correct MIME type is multipart/alternative here!
    MESSAGE = MIMEMultipart('alternative')
    MESSAGE['subject'] = SUBJECT
    MESSAGE['To'] = 'ikeybill1@gmail.com'
    MESSAGE['From'] = 'ikeybill1@gmail.com'
    MESSAGE.preamble = """
Your mail reader does not support the report format.
Please visit at <a href="https://aikufurr.com/fluffster/tickets/">https://aikufurr.com/fluffster/tickets/</a>!"""

    # Record the MIME type text/html.
    HTML_BODY = MIMEText(BODY, 'html')

    # Attach parts into message container.
    # According to RFC 2046, the last part of a multipart message, in this case
    # the HTML message, is best and preferred.
    MESSAGE.attach(HTML_BODY)

    # The actual sending of the e-mail
    server = smtplib.SMTP('smtp.gmail.com:587')

    # Print debugging output when testing
    # if __name__ == "__main__":
    # server.set_debuglevel(1)

    # Credentials (if needed) for sending the mail
    with open(home + "/secret") as f:
        password = json.load(f)["gmailpsk"]

    server.starttls()
    server.login('ikeybill1@gmail.com', password)
    server.sendmail('ikeybill1@gmail.com', ['ikeybill1@gmail.com'], MESSAGE.as_string())
    server.quit()

with open(home + "/secret") as f:
    TOKEN = json.load(f)["fluffstertoken"]
client = commands.Bot(command_prefix="fluf")


def DBCmdUpdate():
    """
    `id`	INTEGER PRIMARY KEY AUTOINCREMENT,
    `name`	TEXT,
    `dir`  TEXT,
    `uses`  INTEGER
    """
    cursor.execute('''SELECT * FROM `fluffster_command`''')

    all_rows = cursor.fetchall()

    toInsert = []

    for f in sorted([f.name for f in os.scandir("static/images/commands") if f.is_dir()]):  # If the dir exists on disk but isn't in the DB
        if f not in [row[1] for row in all_rows]:
            toInsert.append((f, "static/images/commands/" + f, 0))

    if toInsert != []:
        cursor.executemany('''INSERT INTO `fluffster_command`(`name`, `dir`, `uses`) VALUES(?, ?, ?)''', toInsert)
        db.commit()

    cursor.execute('''SELECT * FROM `fluffster_command`''')

    all_rows = cursor.fetchall()

    toRemove = []

    for row in all_rows:
        if row[1] not in [f.name for f in os.scandir("static/images/commands") if f.is_dir()]:
            toRemove.append(row[0])

    if toRemove != []:
        for id in toRemove:
            cursor.execute('''DELETE FROM `fluffster_command` WHERE id = ? ''', (id,))
        db.commit()


@client.event
async def on_ready():
    print('Bot online.')
    await client.change_presence(activity=discord.Game(name='fluffhelp'))


last_file = "unknown"
image = ""
last_qna = "unknown"
qna_image = ""
config = {
    "debugMode": 0,
    "offline": {
    }
}


@client.command(pass_context=True)
async def fdonate(ctx):
    em = discord.Embed(color=0x00FFFF, url="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=P5QHYSBWE77Q2&source=url", title="Click this link or scan the QR Code below to donate!")
    em.set_image(url="https://aikufurr.com/static/images/QR%20code.png")
    em.set_footer(text="Donating to this project allows for greater fluffelopment and keeps the servers running.")
    await ctx.send(embed=em)


@client.command(pass_context=True)
async def fcreeper(ctx):
    if randint(0, 1):
        await ctx.send("Cweepew, aw man, 🚶‍♂️ So we back in de mine, Got ouw pickaxe :pick: swinging fwom, Side :point_left::point_right: to side, Side side :point_left::point_right: to side, dis task's a gwuewing :punch: one, Hope to find some diamonds :gem::gem: to- Night :new_moon: night :new_moon: night, Diamonds :ring: to-night, Heads up, :point_up_2: yuw heaw :ear:a sound, tuwn :eyes: awound and wook up, Totaw shock :anguished: fiwws yuw body, Oh no it's yuw again, I couwd nevew fowget dose, Eyesh :eyes: eyesh :eyes: eyesh,:eyes: Eyesh :eyes: eyesh :eyes: eyesh :eyes: eyesh,:eyes: 'Cause baby :baby: tonight, :new_moon_with_face: de cweepew's twyin' to steaw :moneybag: aww ouw stuff again, 'Cause baby :baby_bottle: tonight, :new_moon: yuw gwab yuw pick:pick:, shovew And bowt 🏃🏻‍♀️ again, bowt 🏃🏻‍♀️ again -gain, And wun:runner: , wun :runner: , untiw it's done :white_check_mark: , done :white_check_mark: , untiw de sun :sun_with_face: comes up in de mown', 'Cause baby :baby_bottle: tonight :new_moon:, de cweepew's twyin' to steaw :moneybag: aww Ouw stuff again, stuff again -gain, Just when yuw dink yuw safe :lock:, Ovewheaw some hissing :snake: fwom, wight be-hind, wight wight be-hind, dat's a nice wife 💁‍♂️ yuw have, Shame it's got to end at dis, Time ⌛️ time :hourglass_flowing_sand: time ⌛️, Time :hourglass_flowing_sand: time ⌛️ time :hourglass_flowing_sand: time ⌛️, Bwows up :bomb:,")
        await ctx.send("And yuw heawd baw dwops :point_down: and yuw couwd use a one-up :point_up_2:, Get inside, don't be tawdy :stopwatch:, So now yuw stuck in dewe, Hawf a heawt :broken_heart: is weft but don't, Die ☠️ die :skull: die ☠️, Die :skull: die ☠️ die :skull: die ☠️, 'Cause baby :baby: tonight :new_moon:, de cweepew's twyin' to steaw :moneybag: aww ouw stuff again, 'Cause baby :baby_bottle: tonight :new_moon_with_face:, yuw gwab yuw pick :pick:, shovew And bowt :runner: again, bowt again -gain. And wun 🏃🏻‍♀️, wun 🏃🏻‍♀️ , untiw it's done, done, untiw de sun ☀️ comes up in de mown, 'Cause baby :baby_bottle: tonight :new_moon:, de cweepew's twyin' to steaw :moneybag: aww Ouw stuff again, (Cweepews, yuw mine) (Haha) Dig up diamonds :gem: , Cwaft dose diamonds :ring: , Make some awmow ⚔️, Get it baby :baby: , Gonna fowge :hammer: it wike yuw so:ok_hand: MwG pwo :punch:, de swowd's :dagger: made of diamond :ring: So come :sweat_drops: at me, bwo, (Huh) Twainin' in yuw woom :house: Undew de towchwight Hone :fist: dat fowm To get yuw weady fow de big fight, :right_facing_fist: Evewy singwe day ☀️, And de whowe :new_moon_with_face:night")
        await ctx.send("Cweepews' out pwowwin':feet: (whew) aww wight, wook at me,:eye: wook at yuw :eye: Take my wevenge, dat's what I'm gonna do I'm a, wawwiow⚔️ baby, What ewse is new? And my bwade's :dagger:gonna teaw dwough yuw,:skull: (Bwing it) 'Cause baby :baby: tonight :new_moon_with_face:, de cweepew's twyin' to steaw :moneybag: aww ouw stuff again, (Gadew yuw stuff, yeah, wet's take back de wowwd :earth_africa: ) Yeah baby :baby_bottle: tonight :new_moon:, (Haha) Have yuw swowd :dagger:, awmow and go :white_check_mark: (It's on) Take yuw wevenge! So fight, fight, :punch::right_facing_fist: wike it's de wast, wast night :new_moon_with_face: of yuw wife :skull:, wife☠️")
        await ctx.send("dem yuw fight:fist:, 'Cause baby :baby: tonight :new_moon:, de cweepew's twyin' to steaw aww ouw stuff :moneybag: again, 'Cause baby :baby_bottle: tonight :new_moon_with_face:, yuw gwab yuw pick :pick:, shovew And bowt 🏃🏻‍♀️ again, bowt again -gain. And wun:runner:, wun:runner:, untiw it's done :white_check_mark: , done :white_check_mark: , untiw de sun :sun_with_face: comes up in de mown, 'Cause baby :baby: tonight :new_moon:, de cweepew's twied to steaw aww ouw stuff:moneybag: again. uwu")
    else:
        await ctx.send("Cweepew, Oh man, So we back in de mine, Got ouw pickaxe swinging fwom, Side to side, Side side to side, dis task's a gwuewing one, Hope to find some diamonds to- Night night night, Diamonds to-night, Heads up, yuw heaw a sound, tuwn awound and wook up, Totaw shock fiwws yuw body, Oh no it's yuw again, I couwd nevew fowget dose, Eyesh eyesh eyesh, Eyesh eyesh eyesh eyesh, 'Cause baby tonight, de cweepew's twyin' to steaw aww ouw stuff again, 'Cause baby tonight, yuw gwab yuw pick, shovew And bowt again, bowt again -gain, And wun , wun , untiw it's done , done , untiw de sun comes up in de mown', 'Cause baby tonight , de cweepew's twyin' to steaw aww Ouw stuff again, stuff again -gain, Just when yuw dink yuw safe , Ovewheaw some hissing fwom, wight be-hind, wight wight be-hind, dat's a nice wife yuw have, Shame it's got to end at dis, Time time time , Time time time time , Bwows up , And yuw heawd baw dwops and yuw couwd use a one-up , Get inside, don't be tawdy , So now yuw stuck in dewe, Hawf a heawt is weft but don't, Die die die , Die die die die , 'Cause baby tonight , de cweepew's twyin' to steaw aww ouw stuff again, 'Cause baby tonight , yuw gwab yuw pick , shovew And bowt again, bowt again -gain. And wun , wun , untiw it's done, done, untiw de sun comes up in de mown, 'Cause baby tonight , de cweepew's twyin' to steaw aww Ouw stuff again, (Cweepews, yuw mine) (Haha) Dig up diamonds , Cwaft dose diamonds , Make some awmow , Get it baby , Gonna fowge it wike yuw so MwG pwo , de swowd's made of diamond So come at me, bwo, (Huh) Twainin' in yuw woom Undew de towchwight Hone dat fowm To get yuw weady fow de big fight, Evewy singwe day , And de whowe night, Cweepews' out pwowwin' (whew) aww wight, wook at me, wook at yuw")
        await ctx.send("Take my wevenge, dat's what I'm gonna do I'm a, wawwiow baby, What ewse is new? And my bwade's gonna teaw dwough yuw, (Bwing it) 'Cause baby tonight , de cweepew's twyin' to steaw aww ouw stuff again, (Gadew yuw stuff, yeah, wet's take back de wowwd ) Yeah baby tonight , (Haha) Have yuw swowd , awmow and go (It's on) Take yuw wevenge! So fight, fight, wike it's de wast, wast night of yuw wife , wife Show dem yuw fight, 'Cause baby tonight , de cweepew's twyin' to steaw aww ouw stuff again, 'Cause baby tonight , yuw gwab yuw pick , shovew And bowt again, bowt again -gain. And wun, wun, untiw it's done , done , untiw de sun comes up in de mown, 'Cause baby tonight , de cweepew's twied to steaw aww ouw stuff again. uwu")


@client.command(pass_context=True)
async def frole(ctx, *, role: discord.Role):
    member = ctx.message.author
    if role in ctx.author.roles:
        await member.remove_roles(role)
        await ctx.send("`{}` removed".format(str(role)))
    else:
        await member.add_roles(role)
        await ctx.send("`{}` added".format(str(role)))


@client.command(pass_context=True)
async def fpurge(ctx, number):
    if ctx.message.author.permissions_in(ctx.message.channel).administrator:  # If the user has admin perms
        number = int(number)
        if number > 99 or number < 1:
            await ctx.send("I can only delete messages within a range of 1 - 99", delete_after=10)
        else:
            mgs = []
            channel = ctx.message.channel
            async for x in ctx.history(limit=int(number + 1)):
                mgs.append(x)
            await channel.delete_messages(mgs)
            await ctx.send('Success!', delete_after=4)
    else:
        ctx.send("Admin only command")


@client.command(pass_context=True)
async def fsauce(ctx):
    if ctx.message.attachments:
        for attachment_json in ctx.message.attachments:
            picURL = attachment_json.url

            url = "https://saucenao.com/search.php"
            payload = {'url': picURL}

            r = requests.post(url, data=payload).text

            soup = BeautifulSoup(r, "html.parser")

            try:
                found = "https://e" + str(re.findall(r'<a href="https://e(.*?)"', str(soup.find_all("td", "resulttablecontent")))[0])
            except:
                found = re.findall(r'<div class="resultmiscinfo"><a href="(.*?)"', str(soup.find_all("td", "resulttablecontent")))[0]

            em = discord.Embed(color=0x00FFFF, url=found, title="Sauce")

            em.set_footer(text="""All the images are found from https://saucenao.com/""")
            await ctx.send(embed=em)  # Sends the embed

    else:
        picURL = ctx.message.content.split()[1]
        url = "https://saucenao.com/search.php"
        payload = {'url': picURL}

        r = requests.post(url, data=payload).text

        soup = BeautifulSoup(r, "html.parser")

        try:
            found = "https://e" + str(re.findall(r'<a href="https://e(.*?)"', str(soup.find_all("td", "resulttablecontent")))[0])
        except:
            found = re.findall(r'<div class="resultmiscinfo"><a href="(.*?)"', str(soup.find_all("td", "resulttablecontent")))[0]

        em = discord.Embed(color=0x00FFFF, url=found, title="Sauce")

        em.set_footer(text="""All the images are found from https://saucenao.com/""")
        await ctx.send(embed=em)  # Sends the embed


@client.command(pass_context=True)
async def fupload(ctx):
    if ctx.message.author.permissions_in(ctx.message.channel).administrator:  # If the user has admin perms
        my_string = ctx.message.content
        if ctx.message.attachments:
            saveTo = my_string.split("fluffupload ", 1)[1].rsplit(' ', 1)[0]
            for attachment_json in ctx.message.attachments:
                picURL = attachment_json.url
                picName = picURL.rsplit('/', 1)[1]
                if 'unknown' in picName:
                    now = str(datetime.datetime.now())[:19]
                    now = now.replace(":", "_")
                    now = now.replace(" ", "_")
                    picName = picName.replace('unknown', 'unknown--' + now)

                await ctx.send("Saving to: `{}`\nFile URL: `{}`\nFile Name: `{}`".format(saveTo, picURL, picName))
                try:
                    opener = urllib.request.build_opener()
                    opener.addheaders = [('User-agent', 'Mozilla/5.0')]
                    urllib.request.install_opener(opener)
                    urllib.request.urlretrieve(picURL, "{}/{}/{}".format('static/images/commands', saveTo, picName))
                    await ctx.send("Saved")
                except Exception as err:
                    await ctx.send("Error saving: `{}`".format(str(err)))
        else:
            saveTo = my_string.split(" ")[1]
            n = 2
            groups = my_string.split(' ')
            for url in groups[n:]:
                picName = url.rsplit('/', 1)[1]
                if 'unknown' in picName:
                    now = str(datetime.datetime.now())[:19]
                    now = now.replace(":", "_")
                    now = now.replace(" ", "_")
                    picName = picName.replace('unknown', 'unknown--' + now)

                await ctx.send("Saving to: `{}`\nFile URL: `{}`\nFile Name: `{}`".format(saveTo, url, picName))

                try:
                    opener = urllib.request.build_opener()
                    opener.addheaders = [('User-agent', 'Mozilla/5.0')]
                    urllib.request.install_opener(opener)
                    urllib.request.urlretrieve(url, "{}/{}/{}".format('static/images/commands', saveTo, picName))
                    await ctx.send("Saved")
                except Exception as err:
                    await ctx.send("Error saving: `{}`".format(str(err)))
    else:
        await ctx.send("Admin only command")


@client.command(pass_context=True)
async def fpoll(ctx):
    lines = ctx.message.content.splitlines()
    try:
        title = ":bar_chart: " + lines[0].split(" ", 1)[1]
    except:
        title = ":bar_chart: Poll"
    lines.pop(0)
    description=""
    if len(lines) > 26:
        return await ctx.send("Polls can only be up to 26 lines")
    if lines == []:
        return await ctx.send("""Improper usage, example: ```
fluffpoll What do you think?
Option 1
Option 2
Option 3
```There is a maximum of 26 options.""")
    loop = 1
    controls = []
    for line in lines:
        emoji = dict(zip(range(1, 27), ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹", "🇺", "🇻", "🇼", "🇽", "🇾", "🇿"]))[loop]
        description += "{}: {}\n".format(emoji, line)
        controls.append(emoji)
        loop += 1
    await ctx.message.delete()
    em = discord.Embed(color=0x00FFFF, description=description[:-1], title=title)
    controller_message = await ctx.send(embed=em)
    for reaction in controls:
        try:
            await controller_message.add_reaction(str(reaction))
        except discord.HTTPException:
            pass


async def returnesix(message):
    try:
        tags = ''.join(message.content.split('fluffesix', 1)[1])
    except:
        tags = ''.join(message.content.split('fluffe6', 1)[1])

    r = requests.get("https://e621.net/post/index.json?tags=" + tags, headers={'User-Agent': 'Firefox'})
    index = randint(0, len(r.json()))
    if message.channel.is_nsfw() or 'rating:s' in tags:
        pass
    else:
        await message.channel.send("This commands is NSFW, it must be sent in a NSFW channel")
        return
    try:
        em = discord.Embed(color=0x00FFFF, url="https://e621.net/post/show/" + str(r.json()[index]['id']), title="Source")
        em.set_image(url=str(r.json()[index]['file_url']))
        em.set_footer(text="Images from: https://e621.net")
        await message.channel.send(embed=em)
    except Exception as error:
        await message.channel.send(r.json()[0]['file_url'])
        if config['debugMode']:
            await message.channel.send(str(error) + "\nTags:```\n{}```".format(str(tags)))


async def sendimages(message, itype, iseveryone, loopamt):
    cmd = {'cuddle': ['USER1 runs over to USER2 and cuddles them.', 'USER1 gets close to USER2 and cuddles them.'],
           'boop': ['USER1 runs over to USER2 and boops them.', 'USER2 was booped by USER1.',
                    'USER2 has been booped by USER1 while giggling.', 'USER1 runs over to USER2 and boops them.',
                    'USER1 walks up close to USER2 and boops them.', 'USER1 boops USER2 while giggling.',
                    'USER2 got booped by USER1'],
           'lick': ['USER1 licked USER2', 'USER1 walks over to USER2 and lickes them', 'USER2 has been licked by USER1',
                    'USER1 lickes USER2 playfully'],
           'kiss': ['USER1 kisses USER2', 'USER1 walks over to USER2 to give them a kiss',
                    'USER2 has been kissed by USER1'],
           'hug': ['USER1 gives USER2 a big ol\' hug',
                   'USER1 sneaks up behind USER2 and gives them a surprise hug',
                   'USER1 hugs USER2 with a very warm smile',
                   'USER1 lunges at USER2, wrapping their arms around lovingly',
                   'USER1 blushes a little bit, carefully approaching USER2 and giving them a tender hug',
                   'USER1 hugs USER2 in a lovable way',
                   'USER2 wasn\'t suspecting anything at first, but then suddenly USER1 appears and hugs them!',
                   'USER1 scoots closer over to USER2 on a park bench, then wraps their arms around the unsuspecting hug '
                   'victim. USER1 confidently steps forward, giving USER2 a tight hug.',
                   'USER1 opens their arms for USER2 so they could get a lovable hug from USER1']}
    for _ in range(loopamt):
        try:
            if 'self' in itype:
                selfhug = 1
                itype = itype[:-4]
            else:
                selfhug = 0
            r = requests.get("https://aikufurr.com/api/images/" + itype)
        except:
            return

        try:
            cursor.execute('''SELECT `uses` FROM `fluffster_command` WHERE name = ?''', (itype,))
            all_rows = cursor.fetchall()
            cursor.execute('''UPDATE `fluffster_command` SET `uses` = ? WHERE `name` = ?''', (int(all_rows[0][0])+1, itype))
            db.commit()
            timesUsed = int(all_rows[0][0])+1
        except:
            all_rows = [["error"]]
            PrintException()

        emfoot = "Images from: https://aikufurr.com/ | Usages: " + str(timesUsed)  # Sets the footer of the embeded

        try:
            if selfhug:
                name1 = "FluffsterBot"  #TODO: Find out how to get bot's name
                if message.mentions:
                    name2 = message.mentions[0].nick or message.mentions[0].name
                else:
                    name2 = message.author.nick or message.author.name
            else:
                name1 = message.author.nick or message.author.name
                name2 = message.mentions[0].nick or message.mentions[0].name
            try:
                em = discord.Embed(color=0x00FFFF, url=r.json(), title=str(str(random.choice(cmd[itype]).replace('USER1', '**' + name1 + '**')).replace('USER2', '**' + name2 + '**')))  # Creates the embed and the title of the embed with the url from the API
            except:
                if config['debugMode']:
                    await DiscordPrintException(message)
            try:
                em.set_image(url=str(r.json()))  # Sets the image for the embed using the API from above.
            except:
                if config['debugMode']:
                    await DiscordPrintException(message)
            em.set_footer(text=emfoot)  # Sets the embedded footer
            await message.channel.send(embed=em)  # Sends the embed
        except:
            try:
                em = discord.Embed(color=0x00FFFF, url=r.json(), title="Image not loading? Click here!")  # Creates the embed with the backup title with the url from the API
                em.set_image(url=str(r.json()))  # Sets the image for the embed using the API from above.
                em.set_footer(text=emfoot)  # Sets the embedded footer
                await message.channel.send(embed=em)  # Sends the footer
                if config['debugMode']:
                    await PrintException(message)
            except:
                if config['debugMode']:
                    await PrintException(message)
                    await message.channel.send(r.json())
                else:
                    pass


@client.event
async def on_raw_reaction_add(payload):
    ch = client.get_channel(payload.channel_id)
    msg = await ch.fetch_message(payload.message_id)
    guild = client.get_guild(549422256850468864)
    user = await guild.fetch_member(payload.user_id)
    if payload.message_id != 572129912081743873:
        return
    try:
        await msg.remove_reaction(payload.emoji, user)
    except discord.HTTPException:
        pass


    if str(payload.emoji.id) == "550137030844088321":
        role = discord.utils.get(guild.roles, name="Kade's Kingdom")
    elif str(payload.emoji.id) == "550137074515443734":
        role = discord.utils.get(guild.roles, name="Nicole's Minions")
    elif str(payload.emoji.id) == "550137100234784808":
        role = discord.utils.get(guild.roles, name="Rick's Reptiles")
    elif str(payload.emoji.id) == "550137053669752849":
        role = discord.utils.get(guild.roles, name="Ness' Nest")
    elif str(payload.emoji.id) == "550136985495535616":
        role = discord.utils.get(guild.roles, name="Harvey's Hollow")
    elif str(payload.emoji.id) == "550137124222009384":
        role = discord.utils.get(guild.roles, name="Riley's Allies")

    offset = 0
    for a in user.roles:
        if offset > 0:
            try:
                if ("Kade's Kingdom" in str(a)) or ("Nicole's Minions" in str(a)) or ("Harvey's Hollow" in str(a)) or ("Rick's Reptiles" in str(a)) or ("Ness' Nest" in str(a)) or ("Riley's Allies" in str(a)):
                    await user.remove_roles(a)
                    #await ch.send("Removed `{}`".format(a.name), delete_after=2)
            except:
                pass
        offset += 1

    await user.add_roles(role)
    #await ch.send("Added `{}`".format(role.name), delete_after=2)

async def masterCommands(message):
    print(message.content)
    if ('InSettle' in [role.name for role in message.author.roles]) and ('settlechannel-' not in message.channel.name):  # If the user has the InSettle role and is not in a settle channel
        await message.delete()  # Delete their message

    if ('fluffdebugmode' in str(message.content)) and (str(message.author.id) == "308681202548604938"):  # If Aikufurr types: fluffdebugmode
        if config['debugMode']:
            config['debugMode'] = 0
            await message.channel.send("Debug Mode deactivated.")
        elif not config['debugMode']:
            config['debugMode'] = 1
            await message.channel.send("Debug Mode deactivated.")

    if message.content.lower().startswith('fluffimafox'):
        await message.author.edit(nick="Fluffy Fox")
    if message.content.lower().startswith("flufflink"):
        url = message.content.split(" ")[1]
        text = message.content.split(url, 1)[1]

        em = discord.Embed(color=0x00FFFF, url=url, title=text)
        em.set_footer(text="Hyperlink requested by " + str(message.author) + " | flufflink URL TEXT")

        await message.delete()
        await message.channel.send(embed=em)

    if 'fluffwishlist' in message.content:
        """
        `id`	INTEGER PRIMARY KEY AUTOINCREMENT,
    	`uuid`	TEXT,
    	`author`	INTEGER,
        `datetime`  TEXT,
        `item`  TEXT
        """
        try:
            item = message.content.split("fluffwishlist ", 1)[1]
        except:
            item = None

        if 'fluffwishlistdelete' in message.content:
            todel = message.content.split("delete ", 1)[1]
            cursor.execute('''SELECT author FROM `fluffster_wishlist` WHERE uuid = ?''', (todel,))
            all_rows = cursor.fetchall()
            if all_rows[0][0] == message.author.id:
                cursor.execute('''DELETE FROM `fluffster_wishlist` WHERE uuid = ? ''', (todel,))
                db.commit()
                await message.channel.send("Deleted item.")
            else:
                await message.channel.send("This item isn't yours")
        elif not item:
            cursor.execute('''SELECT * FROM `fluffster_wishlist`''')

            all_rows = cursor.fetchall()



            out = "```\n"
            found = False
            for row in all_rows:
                if str(message.author.id) in str(row[2]):
                    found = True
                    out += row[1] + ": " + row[4] + "\n"

            out = out[:-1]
            out += "```To delete an item: `fluffwishlistdelete KEY`"

            if not found:
                out = "No items on your wishlist, to add an item type: `fluffwishlist ITEM` - `ITEM` being the item."

            await message.channel.send(out)
        else:
            cursor.execute('''INSERT INTO `fluffster_wishlist`(`uuid`, `author`, `datetime`, `item`) VALUES(?, ?, ?, ?)''', (str(uuid.uuid4()), message.author.id, str(datetime.datetime.now())[:-7], str(item)))
            db.commit()
            await message.channel.send("Added `{}` to your wishlist".format(str(item)))

    if 'fluffoffline' in message.content:
        if str(message.author.id) in config["offline"]:
            del config["offline"][str(message.author.id)]
            await message.channel.send("Offline mode deactivated.")
        else:
            try:
                reason = message.content.split("fluffoffline ", 1)[1]
            except:
                reason = None
            config["offline"][str(message.author.id)] = {"isOffline": 1, "reason": reason}

            await message.channel.send("Activated offline mode. Any pings you receive during offline mode I'll inform the user. To disable send `fluffoffline`")

    for user in config["offline"]:
        if user in str(message.content) and config["offline"][user]["isOffline"]:
            if config["offline"][user]["reason"] == "school":
                time = datetime.datetime.now().strftime("%H:%M")  # 24h 00:00
                day = datetime.datetime.now().strftime("%A")  # Full with caps
                inLesson = 0

                if '8:40' < time < '10:00':
                    inLesson = 1
                elif '10:05' < time < '11:25':
                    inLesson = 1
                elif '11:35' < time < '12:55':
                    inLesson = 1
                elif '13:40' < time < '15:15':
                    inLesson = 1
                elif ('Thursday' in day) and (time < '16:25'):
                    inLesson = 1
                elif time < '15:15':
                    inLesson = 0
                else:

                    await message.channel.send("<@{}> is currently not in a Lesson, but may not be able to respond to messages due to poor signal.").format(user)

                if inLesson:
                    await message.channel.send("<@{}> is currently in a Lesson, please try again later.").format(user)
                else:
                    await message.channel.send("<@{}> is currently offline, please try again later.").format(user)
            else:
                messagetosend = "<@{}> is currently offline, please try again later.".format(user)

                if config["offline"][user]["reason"]:
                    messagetosend += " Reason: `{}`".format(config["offline"][user]["reason"])

                await message.channel.send(messagetosend)

    if message.content.lower().startswith('fluffticket') or message.content.lower().startswith('fluffissue'):
        await message.channel.send("To submit an issue go to: https://github.com/Aikufurr/Aikufurr/issues")

    elif message.content.lower().startswith('fluffinput'):
        msg = message.content.lower().split("fluffinput", 1)[1]
        await message.channel.send("GOT: " + str(msg))

    elif message.content.lower().startswith("fluffupdate"):
        DBCmdUpdate()

        await message.channel.send("Updated")

    elif message.content.lower().startswith('fluffeval'):
        if '308681202548604938' in str(message.author.id):
            eval = message.content.split("fluffeval", 1)[1]
            try:
                await message.channel.send('`{}`'.format(eval))
                await message.channel.send('```\n{}```'.format(str(os.popen(eval).read()).replace('\\n', '\n')))
            except Exception as error:
                await message.channel.send(str(error))
        return

    elif message.content.lower().startswith('fluffhelp'):
        embed = discord.Embed(title="My list of commands is at: https://aikufurr.com/fluffster/commands", url="https://aikufurr.com/fluffster/commands", color=0x00ffff)
        await message.channel.send(embed=embed)
        return

    elif message.content.lower().startswith('fluffesix') or message.content.lower().startswith('fluffe6'):
        asyncio.ensure_future(returnesix(message))  # Makes function async so it can be run multiple times

    elif message.content.lower().startswith("fluffsettle"):

        if 'end' not in message.content.lower().split(" "):  # If message doesn't end with end, example, fluffsettle end
            if message.author.permissions_in(message.channel).administrator:  # If the user has admin perms
                guild = message.guild
                settlechannelName = "settlechannel-"
                for _ in range(4):
                    settlechannelName += str(random.randint(0, 9))  # Generates 4 random numbers
                await guild.create_text_channel(settlechannelName)  # Creates channel

                channel = get(guild.channels, name=settlechannelName)
                usersmsg = ""

                role = discord.utils.get(message.guild.roles, name="InSettle")  # Searches guild for role
                if not role:  # If the role doesn't exist
                    role = await message.guild.create_role(name="InSettle", permissions=discord.Permissions.none())  # Creates a role called 'InSettle' with no perms

                for user in message.mentions:
                    await channel.set_permissions(user, read_messages=True, send_messages=True)  # Updates the channel perm to allow that user to read/send
                    usersmsg += " <@" + str(user.id) + ">"
                    await user.add_roles(role)  # Adds the 'InSettle' role to the user
                await channel.set_permissions(guild.default_role, read_messages=False, send_messages=False)  # Sets the perms of the channel to that @everyone can't read/send

                await message.channel.send("Channel <#" + str(channel.id) + "> has been created.")

                await channel.send("Users" + usersmsg + ", you have been sent here to settle a fight, when you are done, get an admin to say `fluffsettle end`")
            else:
                await message.channel.send("Please get an admin to start a settle")
        else:
            if 'settlechannel-' not in message.channel.name:  # If the channel name doesn't start with that
                await message.channel.send("This isn't a settlechannel")
            else:
                if message.author.permissions_in(message.channel).administrator:  # If the user has admin perms
                    await message.channel.delete()  # Deletes user message
                    for member in message.guild.members:  # Loops each member in guild
                        for role in member.roles:  # Loops each role that member has
                            if role.name == "InSettle":  # If the role is 'InSettle'
                                await member.remove_roles(role)  # Removes that role
                else:
                    await message.channel.send("Please get an admin to end")

    elif message.content.lower().startswith('fluff') and message.author.id is not "566577180461629460" and "purge" not in message.content.lower():
        r = re.compile("( ?[^ ]+)")  # Regex search for getting the type
        itype = r.findall(message.content.lower().split("fluff", 1)[1])[0]  # Uses regex to get the command
        if itype is "":
            return
        split = message.content.split()
        loopamt = 1  # Defaults loop amount to 1
        for i in split:  # Loops each word in string
            if i.isdigit():  # if that word is a number
                loopamt = int(i)  # Set the loop amount to that number

        if itype.startswith("y"):  # If the command is NSFW
            if message.channel.is_nsfw():  # If the channel is NSFW
                pass
            else:
                if len(itype) > 1:
                    await message.channel.send("This commands is NSFW, it must be sent in a NSFW channel")
                return
        if 'everyone' in split:
            # asyncio.ensure_future(sendimages(message, itype, 1, 0)) # Makes funtion async so it can be run multiple times
            await message.channel.send("lol, no")
        elif loopamt < 21:
            asyncio.ensure_future(sendimages(message, itype, 0, loopamt))  # Makes funtion async so it can be run multiple times
        else:
            await message.channel.send("Amount is greater than 20")


@client.event
async def on_message(message):
    if '562735462091980820' in str(message.author.id):  # If the message came from Fluffster
        return

    await client.process_commands(message)  # Process the commands above that are not used in on_message
    await masterCommands(message)  # Process the master commands

    attachmentsFound = []
    for attachment_json in message.attachments:
        attachmentsFound.append(attachment_json.url)

    if attachmentsFound != []:
        attachmentsFound = pickle.dumps(attachmentsFound)
    else:
        attachmentsFound = ""

    message.content = pickle.dumps([html.escape(str(message.content))])

    cursor.execute('''INSERT INTO `fluffster_logs`(`deleted`, `guildid`, `guildname`, `channelid`, `channelname`, `userid`, `username`, `usermsg`, `attachments`, `datetime`, `messageid`) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (0, message.guild.id, message.guild.name, message.channel.id, message.channel.name, message.author.id, str(message.author), message.content, attachmentsFound, str(datetime.datetime.now())[:-7], message.id))
    db.commit()


@client.event
async def on_raw_message_edit(payload):
    cursor.execute('''SELECT `usermsg` FROM `fluffster_logs` WHERE messageid = ?''', (payload.data["id"],))

    messages = cursor.fetchall()[0][0]

    messages = pickle.loads(messages)

    messages.append(html.escape(str(payload.data["content"])))

    messages = pickle.dumps(messages)

    cursor.execute('''UPDATE `fluffster_logs` SET `usermsg` = ? WHERE `messageid` = ?''', (messages, payload.data["id"]))
    db.commit()



@client.event
async def on_raw_message_delete(payload):
    cursor.execute('''UPDATE `fluffster_logs` SET `deleted` = 1 WHERE `messageid` = ?''', (payload.message_id,))
    db.commit()


if __name__ == '__main__':
    print('Starting Fluffstet...')
    client.run(TOKEN)
