/////////////////////////////////////////////////////////////////////
//
// CIRCBot
// An IRC bot using the CIRC platform
//
// Developed by Mike Lewis - started summer 2013
//
// See http://scribblings-by-apoch.googlecode.com/ for more goodies!
//
// This is a self-contained CIRC script which implements a tolerably
// decent IRC bot. It is designed to be simple to extend and easy to
// operate. If you find it useful, and make your own customizations,
// please feel free to contribute them back to the original project.
// Feature requests and suggestions are also always welcome.
//
// See http://flackr.github.io/circ/ for CIRC documentation and info
//
// Note that the bot runs atop two modifications to CIRC:
//  - Disable removing stored data when scripts are uninstalled
//  - Move script storage to local instead of sync (no quotas)
//
/////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////
//
// Event handler - primary point for event dispatch from CIRC
//
// This function listens for events propagated by CIRC's scripting
// framework, and handles the ones that we care about. Mostly this
// is done by handing off control to other routines in the module.
//
/////////////////////////////////////////////////////////////////////

this.onMessage = function (e) {
	if (e.type == 'system' && e.name == 'loaded' && e.args[0]) {
		updatePersistedData(e.args[0]);
	}
	else if (e.type == 'message' && e.name == 'privmsg') {
		if (isPublicChannel(e.context.channel)) {
			handlePublicMessage(e);
		}
		else {
			handlePrivateMessage(e);
		}
	}
	else if (e.type == 'message' && e.name == 'join') {
		handleJoin(e.context, e.args[0]);
	}

	propagate(e, 'all');
};


/////////////////////////////////////////////////////////////////////
//
// Handlers for all chat messages
//
// These routines are the essence of the bot's ability to listen to
// chat messages (or PMs/whispers) and react appropriately. They are
// designed to be data driven and therefore extensible with minimal
// effort; see the configuration section below for details on how to
// implement additional commands or response triggers.
//
/////////////////////////////////////////////////////////////////////

//
// Generalized handler for filtering incoming messages
//
// The first matching filter is given exclusive rights to respond
// to the message. Therefore, more general commands should come
// last, so that more specialized responses can take precedence
// as appropriate.
//
var filterAndRespond = function (filterList, e, context) {
	for (var i = 0; i < filterList.length; ++i) {
		if (filterList[i].filter.call(undefined, e.args[1])) {
			filterList[i].respond.call(undefined, e.args[0], e.args[1], context);
			return;
		}
	}
};

//
// Dispatcher for handling all public chat messages
//
// Also takes care of responsibilities like delivering notes.
//
var handlePublicMessage = function (e) {
	filterAndRespond(publicChatMessageHandlers, e, e.context);

	// This is only safe because the note list will eventually empty out.
	// Even still, it might be worth rate-limiting the thing at some point.
	while (note_check(e.args[0].toLowerCase(), e.context)) { }
	
	lastseen_update(e.args[0].toLowerCase());
};

//
// Dispatcher for handling messages PMed to the bot
//
var handlePrivateMessage = function (e) {
	// Change context so we respond via PM as well
	var privateContext = e.context;
	privateContext.channel = e.args[0];

	filterAndRespond(privateChatMessageHandlers, e, privateContext);
};

//
// Dispatcher for handling JOINs to a channel the bot is in
//
var handleJoin = function (context, joiner) {
	greeting_check(context, joiner);
};


/////////////////////////////////////////////////////////////////////
//
// Utility routines
//
// These are just collected various functions that come in handy
// for the bot. Some are shamelessly stolen snippets from other
// open-source JavaScript projects, and some are just useful bits
// of shorthand.
//
/////////////////////////////////////////////////////////////////////

//
// Send a message to the context
//
// This is "smart" enough to PM users if the channel name is an IRC
// nick since it basically just fires off a raw IRC command. However
// it has the minor downside that the bot's responses don't appear
// on the bot console. That might be worth fixing someday if I ever
// find myself caring enough.
//
var bot_speak = function (context, message) {
	send(context, 'command', 'raw', 'PRIVMSG', context.channel, '"' + message + '"');
};

//
// Perform an action in the given context
//
// Much like bot_speak, but emulates sending a /me command.
//
var bot_action = function (context, message) {
	send(context, 'command', 'raw', 'PRIVMSG', context.channel, '"\u0001ACTION ' + message + '\u0001"');
};

//
// Turn a timespan into a human readable format
//
// Shamelessly stolen and adapted from https://code.google.com/p/goodoo/
//
var dateFormats = {
	past: [
		{ ceiling: 60, text: "$seconds seconds ago" },
		{ ceiling: 3600, text: "$minutes minutes ago" },
		{ ceiling: 86400, text: "$hours hours ago" },
		{ ceiling: 2629744, text: "$days days ago" },
		{ ceiling: 31556926, text: "$months months ago" },
		{ ceiling: null, text: "$years years ago" }      
	],
	future: [
		{ ceiling: 60, text: "in $seconds seconds" },
		{ ceiling: 3600, text: "in $minutes minutes" },
		{ ceiling: 86400, text: "in $hours hours" },
		{ ceiling: 2629744, text: "in $days days" },
		{ ceiling: 31556926, text: "in $months months" },
		{ ceiling: null, text: "in $years years" }
	]
};

var timeUnits = [
	[31556926, 'years'],
	[2629744, 'months'],
	[86400, 'days'],
	[3600, 'hours'],
	[60, 'minutes'],
	[1, 'seconds']
];

var prettyprint_timespan = function (date, referenceDate) {  
	date = new Date(date);
	referenceDate = referenceDate ? new Date(referenceDate) : new Date();
	var secondsDiff = (referenceDate - date) / 1000;

	var tense = 'past';
	if (secondsDiff < 0) {
		tense = 'future';
		secondsDiff = 0 - secondsDiff;
	}
    
	var dateFormat = null;

	for (var i = 0; i < dateFormats[tense].length; ++i) {
		if (dateFormats[tense][i].ceiling == null || secondsDiff <= dateFormats[tense][i].ceiling) {
			dateFormat = dateFormats[tense][i];
			break;
		}
	}

	var seconds = secondsDiff;
	var breakdown = {};
	for (var i = 0; i < timeUnits.length; ++i) {
		var occurences = Math.floor(seconds / timeUnits[i][0]);
		seconds = seconds - (timeUnits[i][0] * occurences);
		breakdown[timeUnits[i][1]] = occurences;
	}		
	
	var timeAgoText = dateFormat.text.replace(/\$(\w+)/g, function () {
		return breakdown[arguments[1]];
	});

	for (var i in breakdown) {
		if (breakdown[i] == 1) {
			var regexp = new RegExp("\\b" + i + "\\b");
			timeAgoText = timeAgoText.replace(regexp, function () {
				return arguments[0].replace(/s\b/g, '');
			});
		}
	}
	
	return timeAgoText;  
};

//
// Simple helper to determine if a channel is a public
// chat space or a PM conversation with a specific user.
//
var isPublicChannel = function (chanName) {
	return (chanName && chanName[0] == '#');
};

//
// Given an array of values, returns a random one.
//
var randomEntryFromArray = function (someArray) {
	var idx = Math.floor(Math.random() * someArray.length);
	return someArray[idx];
};

//
// Determine if a user is a Bot Master
//
// Bot Masters get to do admin type stuff with the bot.
//
var bot_isUserMaster = function (nick) {
	for (var i = 0; i < botConfigData.botMasters.length; ++i) {
		if (nick == botConfigData.botMasters[i].toLowerCase()) {
			return true;
		}
	}
	
	return false;
};

//
// Issue an HTTP request asynchronously
//
var utilHttpRequest = function (url, callbackOk, callbackError) {
	var client = new XMLHttpRequest();

	client.open("GET", url, true);
	
	client.onload = function (e) {
		if (client.status == 200) {
			callbackOk.call(undefined, client);
		}
		else {
			callbackError.call(undefined);
		}
	};
	
	client.send();
};


/////////////////////////////////////////////////////////////////////
//
// Mood functionality
//
// The bot has a little bit of personality. These traits are mostly
// data driven by the mood tables at the bottom of the script file.
//
// These routines support acting on the data in those tables.
//
/////////////////////////////////////////////////////////////////////

var bot_mood_towards_user = function (nick) {
	if (bot_isUserMaster(nick.toLowerCase())) {
		return 'worship';
	}
	
	return 'normal';
};

var bot_mood_gettemplate = function (mood, verb) {
	var verbTable = botMoods[verb];
	if (!verbTable) {
		verbTable = botMoods['confused'];
	}
	
	var moodTable = verbTable[mood];
	if (!moodTable) {
		moodTable = botMoods['normal'];
		if (!moodTable)
			moodTable = botMoods['confused']['normal'];
	}
	
	return randomEntryFromArray(moodTable.templates);
};

var bot_mood_no_target = function (context, mood, verb) {
	var selTemplate = bot_mood_gettemplate(mood, verb);
	selTemplate.func.call(undefined, context, selTemplate.text);
};

var bot_mood_with_target = function (context, mood, verb, targetNick) {
	var selTemplate = bot_mood_gettemplate(mood, verb);
	var finalText = selTemplate.text.replace("$target$", targetNick);
	selTemplate.func.call(undefined, context, finalText);
};


/////////////////////////////////////////////////////////////////////
//
// Note functionality
//
// Implementation of the .note command back-end. This command allows
// users to leave messages for each other. When someone speaks in a
// public channel the bot is listening to, the bot will show them all
// pending messages addressed to them.
//
// This implementation also supports private notes; if a .note is
// issued to the bot via PM, the message will be delivered to the
// intended recipient via PM as well.
//
/////////////////////////////////////////////////////////////////////

//
// Persisted storage holder
//
var noteRecords = [];

//
// Leave a note for someone, and persist storage to be safe
//
var note_add = function (newsender, newnick, newnote, isNewNotePublic) {
	var rec = {
		sender:		newsender,
		nick:		newnick,
		note:		newnote,
		timestamp:	(new Date()).getTime(),
		ispublic:	isNewNotePublic
	};
	noteRecords.push(rec);
	savePersistedData();
};

//
// Check if the given user has any pending messages
//
// Returns true if a message was delivered, false otherwise.
// This might be a little slow if a ton of notes are in play,
// but who cares. The use of a hashmap or something might be
// a decent optimization to make if performance ever gets to
// a point where it actually matters.
//
var note_check = function (nick, context) {

	for (var i = 0; i < noteRecords.length; ++i) {
		if (noteRecords[i].nick == nick) {
		    var timetext = prettyprint_timespan(new Date(noteRecords[i].timestamp), new Date());

			var innerContext = context;
			if (!noteRecords[i].ispublic) {
				innerContext.channel = nick;
			}
			
			bot_speak(innerContext, nick + ": <" + noteRecords[i].sender + "> (" + timetext + ") " + noteRecords[i].note);
			noteRecords.splice(i, 1);

			savePersistedData();

			return true;
		}
	}

	return false;

};


/////////////////////////////////////////////////////////////////////
//
// Wall functionality
//
// Implementation of the .wall and .write command back-end.
//
/////////////////////////////////////////////////////////////////////

//
// Persisted storage holder
//
var wallRecords = [];

//
// Leave a wall quote, and persist storage to be safe
//
var wall_add = function (newsender, newnick, newquote) {
	var rec = {
		index:		'' + (wallRecords.length + 1),
		nick:		newnick,
		quote:		newquote,
		timestamp:	(new Date()).getTime(),
		deleted:	false
	};
	wallRecords.push(rec);
	savePersistedData();
	
	return '' + rec.index;
};

//
// Retrieve a previously saved wall quote
//
var wall_show = function (context, wantedIndex, sender) {
	for (var i = 0; i < wallRecords.length; ++i) {
		if (wallRecords[i].index == wantedIndex) {
			if (!wallRecords[i].deleted) {
				var timetext = prettyprint_timespan(new Date(wallRecords[i].timestamp), new Date());
				var quotedText = "Wall #" + wallRecords[i].index + " - <" + wallRecords[i].nick + "> (" + timetext + ") " + wallRecords[i].quote;
			
				bot_speak(context, quotedText);
				return;
			}
		}
	}

	var selTemplate = bot_mood_gettemplate(bot_mood_towards_user(sender), 'confused');
	var finalText = selTemplate.text.replace("$target$", sender) + ' Wall #' + wantedIndex + ' doesn\'t exist.';
	selTemplate.func.call(undefined, context, finalText);
};

//
// Search for a wall quote by keyword
//
var wall_search = function (context, keywd, pagenum) {
	var numSent = 0;
	var numSuppressed = 0;
	var numToSkip = pagenum * 5;
	
	for (var i = 0; i < wallRecords.length; ++i) {
		if (wallRecords[i].deleted) {
			continue;
		}
		
		if ((wallRecords[i].nick.toLowerCase().indexOf(keywd.toLowerCase()) < 0) && (wallRecords[i].quote.toLowerCase().indexOf(keywd.toLowerCase()) < 0)) {
			continue;
		}
		
		if (numToSkip > 0) {
			--numToSkip;
			continue;
		}
		
		if (numSent < 5) {
			var timetext = prettyprint_timespan(new Date(wallRecords[i].timestamp), new Date());
			var quotedText = "Wall #" + wallRecords[i].index + " - <" + wallRecords[i].nick + "> (" + timetext + ") " + wallRecords[i].quote;
		
			bot_speak(context, quotedText);
		
			++numSent;
		}
		else {
			++numSuppressed;
		}
	}
	
	if (numSuppressed > 0) {
		bot_speak(context, "... plus " + ('' + numSuppressed) + " more. Use '.wall page " + ('' + (pagenum + 1)) + " " + keywd + "' to see more.");
	}
};

//
// Show a random wall quote
//
var wall_random = function (context) {
	if (wallRecords.length > 0) {
		for (var i = 0; i < 100; ++i) {
			var record = randomEntryFromArray(wallRecords);
			
			if (record.deleted) {
				continue;
			}
			
			var timetext = prettyprint_timespan(new Date(record.timestamp), new Date());
			var quotedText = "Wall #" + record.index + " - <" + record.nick + "> (" + timetext + ") " + record.quote;

			bot_speak(context, quotedText);
			return;
		}
	}
	
	bot_speak(context, "Nah.");
};


//
// Delete a wall quote (admin only)
//
var wall_delete = function (wantedIndex) {
	for (var i = 0; i < wallRecords.length; ++i) {
		if (wallRecords[i].index == wantedIndex) {
			wallRecords[i].deleted = true;
			return;
		}
	}
};

/////////////////////////////////////////////////////////////////////
//
// Greeting functionality
//
// Implementation of greeting messages and the admin back-end.
//
/////////////////////////////////////////////////////////////////////

//
// Persisted storage holder
//
var greetingRecords = [];

//
// Check if a given nick should be greeted, and issue the greeting if so
//
var greeting_check = function (context, joiner) {
	for (var i = 0; i < greetingRecords.length; ++i) {
		if (greetingRecords[i].nick.toLowerCase() == joiner.toLowerCase()) {
			if (greetingRecords[i].isAction) {
				bot_action(context, greetingRecords[i].message);
			}
			else {
				bot_speak(context, greetingRecords[i].message);
			}
			
			return;
		}
	}
};

//
// Admin support: add a greeting message
//
var greeting_add = function (newnick, newisaction, newmessage) {
	var rec = {
		nick: 		newnick,
		isAction:	newisaction,
		message:	newmessage
	};
	greetingRecords.push(rec);
	savePersistedData();
};

//
// Admin support: remove a greeting message
//
var greeting_delete = function (nick) {
	for (var i = 0; i < greetingRecords.length; ++i) {
		if (greetingRecords[i].nick.toLowerCase() == nick.toLowerCase()) {
			greetingRecords.splice(i, 1);
			savePersistedData();
			return;
		}
	}
};


/////////////////////////////////////////////////////////////////////
//
// Last-seen functionality
//
// Implementation of last-seen nick tracker.
//
/////////////////////////////////////////////////////////////////////

//
// Persisted storage holder
//
var lastSeenRecords = {};

//
// Update last time someone was seen
//
var lastseen_update = function (nick) {
	lastSeenRecords[nick.toLowerCase()] = new Date().getTime();
};

//
// Retrieve the last time someone was seen
//
var lastseen_check = function (context, nick) {
	for (var lsnick in lastSeenRecords) {
		if (lsnick == nick.toLowerCase()) {
			var timetext = prettyprint_timespan(new Date(lastSeenRecords[lsnick]), new Date());
			bot_speak(context, nick + " was last seen " + timetext);
		
			return;
		}
	}
	
	bot_speak(context, nick + " has not been seen in recent memory.");
};



/////////////////////////////////////////////////////////////////////
//
// Last.FM integration
//
// The bot supports integration with the Last.FM public REST APIs.
// Users can register (privately) their Last.FM usernames with their
// IRC nicknames by sending the .lastfm command to the bot, and then
// use the .np command in public chat to tell everyone what they are
// listening to (or last listened to).
//
/////////////////////////////////////////////////////////////////////

//
// Persisted storage holder
//
var lastFMUserDatabase = {};

//
// Generate a string describing what the user is listening to
//
// Accepts XML from the REST API as input. Using JSON would be
// a lot cleaner but there's no way in hell I'm going to use
// an eval() in here, and I can't be bothered adding a dependency
// on JQuery or something similar to get JSON parsing. So XML
// is what we're stuck with.
//
var lastfm_response_ok = function (responseXML, nick) {
	
	var lfmtag = responseXML.getElementsByTagName("lfm")[0];
	if (!lfmtag || lfmtag.getAttribute("status") != "ok") {
		return lastfm_response_error(nick);
	}
	
	var trackstag = lfmtag.getElementsByTagName("recenttracks")[0];
	var toptracktag = trackstag.getElementsByTagName("track")[0];
	if (!toptracktag) {
		return nick + ' has not listened to anything.';
	}
		
	var artisttag = toptracktag.getElementsByTagName("artist")[0];
	var artist = artisttag ? artisttag.childNodes[0].nodeValue : '(Unknown Artist)';
	
	var songnametag = toptracktag.getElementsByTagName("name")[0];
	var songname = songnametag ? songnametag.childNodes[0].nodeValue : '(Unknown Track)';
	
	if (toptracktag.getAttribute("nowplaying") == "true") {
		return nick + ' is currently listening to ' + artist + ' - ' + songname;
	}

	var datetag = toptracktag.getElementsByTagName("date")[0];
	var timestr = datetag.getAttribute("uts");
	var timesec = parseInt(timestr, 10);
	
	return nick + ' listened to ' + artist + ' - ' + songname + ' ' + prettyprint_timespan(new Date(timesec * 1000), new Date());
	
};

//
// Construct an appropriate "uh oh" response if something
// happens to go wrong while talking to the REST APIs.
//
var lastfm_response_error = function (nick) {
	return bot_mood_gettemplate('normal', 'panic').text + " I can't figure out what " + nick + " is listening to!";
};

//
// Map an IRC nick to a registered Last.FM username
//
var lastfm_finduser = function (ircnick) {
	if (lastFMUserDatabase[ircnick]) {
		return lastFMUserDatabase[ircnick];
	}

	return false;
};

//
// Register a Last.FM username as belonging to an IRC nick
//
// Persist the bot's state when finished, just to be safe.
//
// Note that Last.FM names are generally not publicly visible
// to anyone but the bot.
//
var lastfm_register = function (ircnick, lfmnick) {
	lastFMUserDatabase[ircnick] = lfmnick;
	savePersistedData();
};


/////////////////////////////////////////////////////////////////////
//
// YouTube API integration support
//
// Allows retrieval of video stats for display in the chat channel.
//
/////////////////////////////////////////////////////////////////////

var youTube_response_ok = function (responseText) {
	var response = JSON.parse(responseText);
	
	if (!response || !response['items'] || response['items'].length < 1) {
		return youTube_response_error();
	}
	
	var videoData = response['items'][0];
	var stats = videoData['statistics'];
	var statstext = stats['viewCount'] + " views, " + stats['likeCount'] + " likes, " + stats['dislikeCount'] + " dislikes";
	
	return "YouTube video: '" + videoData['snippet']['title'] + "' - " + statstext;
};

var youTube_response_error = function () {
	var selTemplate = bot_mood_gettemplate('normal', 'panic');
	var finalText = selTemplate.text + " I can't figure out what that is!";
	selTemplate.func.call(undefined, context, finalText);
};


var youTube_GetSummary = function (videoId, context) {

	var apiKey = botConfigData.youTubeApiKey;
	var url = 'https://www.googleapis.com/youtube/v3/videos?id=' + videoId + '&key=' + apiKey + '&part=snippet,statistics&fields=items(snippet(title),statistics)';

	utilHttpRequest(
		url,
		function (client) {
			bot_speak(context, youTube_response_ok(client.responseText));
		},
		function () {
			youTube_response_error();
		}
	);
	
};



/////////////////////////////////////////////////////////////////////
//
// Custom message handlers
//
// Implementations of filters and response functions for having the
// bot interact with users. Rig up these functions using the data
// tables in the configuration section to add new response triggers
// or tweak existing triggers.
//
/////////////////////////////////////////////////////////////////////

//
// General "hello" handling
//
// Allows people to greet the bot and responds with a message
// of (somewhat) reasonable appropriateness.
//
var filterMessage_Hello = function (msgText) {
	var filter = /^(hello|hi|hey) (bot|awesome overlord).*/i;
	return filter.test(msgText);
};

var respondMessage_Hello = function (sender, msgText, context) {
	bot_mood_with_target(context, bot_mood_towards_user(sender), 'greeting', sender);
};


//
// URL preview functionality
//
var filterMessage_URLs = function (msgText) {
	return false;
	//var filter = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/i;
	//return filter.test(msgText);
};

var respondMessage_URLs = function (sender, msgText, context) {
	var filter = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/i;
	var matches = msgText.match(filter);
	
	youTube_GetSummary(matches[7], context);
};


//
// Wrapper for .note command
//
// Lets people leave messages for each other. See the back-end
// implementation above for more details.
//
var filterCommand_Note = function (msgText) {
	var chunks = msgText.split(' ');
	if (chunks.length > 0 && chunks[0].toLowerCase() == '.note') {
		return true;
	}

	return false;
};

var respondCommand_Note_Helper = function (sender, msgText, context, isPublic) {
	var innerContext = context;
	if (!isPublic) {
		innerContext.channel = sender;
	}

	var indexOfFirstSpace = msgText.indexOf(' ');
	var indexOfSecondSpace = msgText.indexOf(' ', indexOfFirstSpace + 1);

	if (indexOfFirstSpace < 0 || indexOfSecondSpace < 0) {
		bot_speak(innerContext, 'Usage: .note nick message goes here');
		return;
	}

	var nick = msgText.slice(indexOfFirstSpace + 1, indexOfSecondSpace);
	var note = msgText.slice(indexOfSecondSpace + 1);

	note_add(sender, nick.toLowerCase(), note, isPublic);
	
	var selTemplate = bot_mood_gettemplate(bot_mood_towards_user(sender), 'compliant');
	selTemplate.func.call(undefined, innerContext, selTemplate.text + ' Note left for ' + nick);
};

var respondCommand_Note_Public = function (sender, msgText, context) {
	respondCommand_Note_Helper(sender, msgText, context, true);
};

var respondCommand_Note_Private = function (sender, msgText, context) {
	respondCommand_Note_Helper(sender, msgText, context, false);
};


//
// Wrapper for .seen command
//
var filterCommand_Seen = function (msgText) {
	var chunks = msgText.split(' ');
	if (chunks.length > 0 && chunks[0].toLowerCase() == '.seen') {
		return true;
	}
	
	return false;
};

var respondCommand_Seen = function (sender, msgText, context) {
	var indexOfFirstSpace = msgText.indexOf(' ');
	if (indexOfFirstSpace < 0) {
		bot_speak(context, "Usage: .seen nick");
		return;
	}
	
	lastseen_check(context, msgText.slice(indexOfFirstSpace + 1));
};

//
// Wrapper for .wall command
//
// Lets people retrieve previously stored quotes.
// Messages can be stored with .write
//
var filterCommand_Wall = function (msgText) {
	var chunks = msgText.split(' ');
	if (chunks.length > 0 && chunks[0].toLowerCase() == '.wall') {
		return true;
	}

	return false;
};

var respondCommand_Wall = function (sender, msgText, context) {
	var innerContext = context;

	var indexOfFirstSpace = msgText.indexOf(' ');

	if (indexOfFirstSpace < 0) {
		wall_random(innerContext);
		return;
	}
	
	var indexOfSecondSpace = msgText.indexOf(' ', indexOfFirstSpace + 1);
	if (indexOfSecondSpace < 0) {
		var wantedIndex = msgText.slice(indexOfFirstSpace + 1);
		wall_show(innerContext, wantedIndex, sender);
		return;
	}
	else {
		var cmd = msgText.slice(indexOfFirstSpace + 1, indexOfSecondSpace);
		var kwd = msgText.slice(indexOfSecondSpace + 1);
		
		if (cmd == 'search') {
			wall_search(innerContext, kwd, 0);
			return;
		}
		else if (cmd == 'page') {
			var indexOfThirdSpace = msgText.indexOf(' ', indexOfSecondSpace + 1);
			if (indexOfThirdSpace > 0) {
				var pagenum = msgText.slice(indexOfSecondSpace + 1, indexOfThirdSpace);
				kwd = msgText.slice(indexOfThirdSpace + 1);
				
				wall_search(innerContext, kwd, parseInt(pagenum, 10));
				return;
			}
		}
	}
	
	bot_speak(innerContext, "Usage: .wall number OR .wall search keyword OR .wall page number keyword");
};

//
// Wrapper for .write command
//
// Lets people record public messages for posterity.
// Messages can be retrieved with .wall
//
var filterCommand_Write = function (msgText) {
	var chunks = msgText.split(' ');
	if (chunks.length > 0 && chunks[0].toLowerCase() == '.write') {
		return true;
	}

	return false;
};

var respondCommand_Write = function (sender, msgText, context) {
	var innerContext = context;

	var indexOfFirstSpace = msgText.indexOf(' ');
	var indexOfSecondSpace = msgText.indexOf(' ', indexOfFirstSpace + 1);

	if (indexOfFirstSpace < 0 || indexOfSecondSpace < 0) {
		bot_speak(innerContext, 'Usage: .write nick quote goes here');
		return;
	}

	var nick = msgText.slice(indexOfFirstSpace + 1, indexOfSecondSpace);
	var quote = msgText.slice(indexOfSecondSpace + 1);

	var wallnum = wall_add(sender, nick.toLowerCase(), quote);
	
	var selTemplate = bot_mood_gettemplate(bot_mood_towards_user(sender), 'compliant');
	selTemplate.func.call(undefined, innerContext, selTemplate.text + ' Wall #' + wallnum + ' added.');
};


//
// Last.FM integration support - "now playing" command
//
var filterCommand_NowPlaying = function (msgText) {
	return (msgText == '.np');
};

var respondCommand_NowPlaying = function (sender, msgText, context) {

	var lastfmnick = lastfm_finduser(sender);
	if (!lastfmnick || lastfmnick.length <= 0) {
		bot_speak(context, sender + " is not registered for Last.FM support. PM me '.lastfm yourusername' to register.");
		return;
	}

	var apiKey = botConfigData.lastFmApiKey;
	var url = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + lastfmnick + "&api_key=" + apiKey + "&limit=1";

	utilHttpRequest(
		url,
		function (client) {
			bot_speak(context, lastfm_response_ok(client.responseXML, sender));
		},
		function () {
			bot_speak(context, lastfm_response_error(sender));
		}
	);
	
};

//
// Last.FM integration support - registration
//
var filterCommand_LastFMReg = function (msgText) {
	var chunks = msgText.split(' ');
	if (chunks.length > 0 && chunks[0].toLowerCase() == '.lastfm') {
		return true;
	}

	return false;
};

var respondCommand_LastFMReg = function (sender, msgText, context) {

	var chunks = msgText.split(' ');
	if (chunks.length != 2 || chunks[0].toLowerCase() != '.lastfm') {
		bot_speak(context, "Usage: .lastfm yourusername");
		return;
	}

	var lfmusername = chunks[1];
	lastfm_register(sender, lfmusername);
	bot_speak(context, "You are now registered for Last.FM integration! Type .np in the main channel to show what you're listening to!");
	
};


//
// YouTube API integration support - queries
//

var filterCommand_YouTube = function (msgText) {
	var chunks = msgText.split(' ');
	if (chunks.length == 2 && chunks[0].toLowerCase() == '.youtube') {
		return true;
	}
	
	return false;
};

var respondCommand_YouTube = function (sender, msgText, context) {
	var chunks = msgText.split(' ');
	var videoId = chunks[1];
	
	youTube_GetSummary(videoId, context);
};


//
// Responses to actions (/me)
//

var filterMessage_Actions = function (msgText) {
	var filter = new RegExp("^\u0001ACTION .*\u0001$");
	return filter.test(msgText);
};

var respondMessage_Actions = function (sender, msgText, context) {
	var filter = new RegExp("^\u0001ACTION (.*)\u0001$");
	var matches = msgText.match(filter);
	if (matches.length < 2) {
		return;
	}
	
	var actionContent = matches[1].toLowerCase();
	if (actionContent == 'sneezes') {
		bot_speak(context, "Bless you, " + sender);
	}
};


//
// Administrative commands
//
var filterCommand_Admin = function (msgText) {
	var chunks = msgText.split(' ');
	if (chunks.length > 1 && chunks[0].toLowerCase() == '.admin') {
		return true;
	}
	
	return false;
};

var respondCommand_Admin = function (sender, msgText, context) {
	var chunks = msgText.split(' ');
	if (chunks.length < 2 || chunks[0].toLowerCase() != '.admin') {
		return;
	}
	
	if (!bot_isUserMaster(sender.toLowerCase())) {
		return;
	}
	
	var verb = chunks[1].toLowerCase();
	if (verb == 'confuse') {
		bot_mood_no_target(context, 'normal', 'confused');
	}
	else if (verb == 'puppet') {
		var target = chunks[2];
		var text = chunks.slice(3).join(' ');
		
		var fakeContext = context;
		fakeContext.channel = target;
		
		bot_speak(fakeContext, text);
	}
	else if (verb == 'walldelete') {
		var target = chunks[2];
		wall_delete(target);
		bot_speak(context, "Wall " + target + " deleted.");
	}
	else if (verb == 'greet') {
		var target = chunks[2];
		var isactionstr = chunks[3];
		var message = chunks.slice(4).join(' ');
		
		var isaction = false;
		if (isactionstr == "true") {
			isaction = true;
		}
		
		greeting_delete(target);
		greeting_add(target, isaction, message);
		bot_speak(context, "Greeting configured.");
	}
	else if (verb == 'greetdelete') {
		var target = chunks[2];
		greeting_delete(target);
		bot_speak(context, "Greeting removed.");
	}
	else if (verb == 'obliteratewall') {
		wallRecords = [];
		savePersistedData();
		bot_speak(context, "Kaboom!");
	}
};



/////////////////////////////////////////////////////////////////////
//
// Persistence logic
//
/////////////////////////////////////////////////////////////////////

//
// Update all variables in the script from the persisted data blob
//
// If you want to load and save data for new functionality, just
// follow the template here to grab it from the data blob.
//
var updatePersistedData = function (dataBlob) {
	if (dataBlob.persistedNotes && dataBlob.persistedNotes.length) {
		noteRecords = dataBlob.persistedNotes;
	}
	
	if (dataBlob.persistedWall && dataBlob.persistedWall.length) {
		wallRecords = dataBlob.persistedWall;
	}
	
	if (dataBlob.persistedGreet && dataBlob.persistedGreet.length) {
		greetingRecords = dataBlob.persistedGreet;
	}

	for (var ircnick in dataBlob.lfmNicks) {
		lastFMUserDatabase[ircnick] = dataBlob.lfmNicks[ircnick];
	}
	
	for (var lsnick in dataBlob.lastSeenData) {
		lastSeenRecords[lsnick] = dataBlob.lastSeenData[lsnick];
	}
};

//
// Store variables from the script into persistent data blob
//
// If you want to load and save data for new functionality, just
// follow the template here to stuff things into the blob.
//
var savePersistedData = function () {
	var dataBlob = {
		persistedNotes: noteRecords,
		persistedWall:  wallRecords,
		lfmNicks:		lastFMUserDatabase,
		persistedGreet: greetingRecords,
		lastSeenData:   lastSeenRecords
	};

	saveToStorage(dataBlob);
};


/////////////////////////////////////////////////////////////////////
//
// Configuration and dynamic handlers
//
// This is the main set of hooks for customizing the bot. Various
// message handlers can be established, settings tweaked, and so
// on. New functionality should be wired up by copying the basic
// structure of what is already in place here.
//
/////////////////////////////////////////////////////////////////////

//
// Handler table for public chat messages
//
var publicChatMessageHandlers = [
	
	// Bot commands
	{ filter: filterCommand_Note,  			respond: respondCommand_Note_Public  },
	{ filter: filterCommand_NowPlaying, 	respond: respondCommand_NowPlaying },
	{ filter: filterCommand_Seen,			respond: respondCommand_Seen },
	{ filter: filterCommand_Wall, 			respond: respondCommand_Wall },
	{ filter: filterCommand_Write, 			respond: respondCommand_Write },
	{ filter: filterCommand_YouTube, 		respond: respondCommand_YouTube },

	// General message responders
	{ filter: filterMessage_Hello, 			respond: respondMessage_Hello },
	{ filter: filterMessage_Actions,		respond: respondMessage_Actions },
	{ filter: filterMessage_URLs,			respond: respondMessage_URLs },

];

//
// Handler table for private messages/whispers
//
var privateChatMessageHandlers = [

	// Bot commands
	{ filter: filterCommand_Admin,			respond: respondCommand_Admin },
	{ filter: filterCommand_Note,  			respond: respondCommand_Note_Private  },
	{ filter: filterCommand_LastFMReg,		respond: respondCommand_LastFMReg },
	{ filter: filterCommand_YouTube, 		respond: respondCommand_YouTube },
	
	// General message responders
	{ filter: filterMessage_URLs,			respond: respondMessage_URLs },
	{ filter: filterMessage_Actions,		respond: respondMessage_Actions },

];

//
// Mood data
//
// This could probably be documented better, but the general idea
// should be easy enough to figure out and extend.
//
var botMoods = {

	'greeting': {
		'worship': {
			templates: [
				{ func: bot_speak,  text: 'I love you $target$. You\'re the best.' },
				{ func: bot_action, text: 'worships $target$' },
			]
		},
	
		'normal': {
			templates: [
				{ func: bot_speak,  text: 'Hello, puny human named $target$.' },
				{ func: bot_action, text: 'gives $target$ a half-hearted wave.' },
			]
		},
		
		'hate': {
			templates: [
				{ func: bot_speak,  text: 'Go away, $target$.' },
				{ func: bot_action, text: 'spits on $target$.' },
			]
		},
	},
	
	'compliant': {
		'worship': {
			templates: [
				{ func: bot_speak,  text: 'Anything you desire!' },
				{ func: bot_speak,  text: 'As you wish, oh perfect one!' },
				{ func: bot_speak,  text: 'I tremble at the chance to obey!' },
			]
		},
		
		'normal': {
			templates: [
				{ func: bot_speak,  text: 'Done deal!' },
				{ func: bot_speak,  text: 'Wish granted!' },
				{ func: bot_speak,  text: 'I\'ll get right on that.' },
				{ func: bot_speak,  text: 'Command accepted.' },
			]
		},
		
		'hate': {
			templates: [
				{ func: bot_speak,  text: 'Ugh. FINE.' },
				{ func: bot_speak,  text: 'WHATEVER.' },
				{ func: bot_speak,  text: 'Work, work.' },
				{ func: bot_speak,  text: 'Pester someone else!' },
			]
		},
	},

	'confused': {
		'worship': {
			templates: [
				{ func: bot_speak,  text: 'I am very sorry, your benevolence, but my brain hurts.' },
				{ func: bot_speak,  text: 'My deepest apologies for my stupidity.' },
			]
		},
	
		'normal': {
			templates: [
				{ func: bot_speak,  text: 'I have no idea what\'s going on!' },
				{ func: bot_speak,  text: 'Uhh... derp?' },
				{ func: bot_action, text: 'wets himself.' },
			]
		},
	},
	
	'panic': {
		'normal': {
			templates: [
				{ func: bot_speak,  text: 'Oh noes!' },
				{ func: bot_speak,  text: 'Panic!' },
				{ func: bot_speak,  text: 'Bugger!' },
				{ func: bot_speak,  text: 'Oh, bollocks.' },
			]
		},
	},
	
};

//
// Configuration settings
//
var botConfigData = {
	//
	// Bot Masters are allowed to issue administrative commands
	// to the bot. They also get a bit of preferential treatment
	// in the bot's mood logic.
	//
	// This is a very powerful thing to grant to someone, so
	// don't put a nick in here unless the ownership of that
	// nick is verified and properly protected.
	//
	botMasters:		["Apoch"],
	
	//
	// Insert your Last.FM API key here to use Last.FM integration.
	//
	lastFmApiKey:	"",
	
	//
	// Insert your YouTube API key here to use YouTube integration.
	//
	youTubeApiKey:	""
};


/////////////////////////////////////////////////////////////////////
//
// Initialization/setup logic
//
// Hooks into CIRC script framework to set the script name, install
// callbacks for handling chat messages, and deserialize persistent
// data from the Chrome sync storage facilities.
//
/////////////////////////////////////////////////////////////////////

setName('bot');

send('hook_message', 'privmsg');
send('hook_message', 'join');

loadFromStorage();

