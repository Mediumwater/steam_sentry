var Steam = require("steam");
var fs = require("fs");
var readline = require("readline");
var crypto = require('crypto');

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);

var username;
var password;
var authCode = "";
var sentryfile;

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Username: ", function(answer) {
    username = answer;
    rl.question("Password: ", function(answer2) {
        password = answer2;
        rl.pause();
        steamClient.connect();
    });
});

steamClient.on('connected', function() {
    if (authCode == "") {
        console.log("> Logging in with only username and password");
        steamUser.logOn({
            account_name: username,
            password: password
        });
    } else if (fs.existsSync("./sentry/" + username + '.sentry')){
        sentryfile = fs.readFileSync("./sentry/" + username + '.sentry');
        sha = crypto.createHash('sha1').update(sentryfile).digest()
        console.log("> Logging in with sentry");
        steamUser.logOn({
            account_name: username,
            password: password,
            sha_sentryfile: sha
        });
    } else {
        console.log("> Logging in with Steam Guard code");
        steamUser.logOn({
            account_name: username,
            password: password,
            auth_code: authCode
        });
    }
});

steamClient.on("logOnResponse", function(result) {
    if (result.eresult == Steam.EResult.OK) {
        console.log("successfully logged in");
        if (authCode !== "" && fs.existsSync("./sentry/" + username + '.sentry'))
            process.exit();
    } else if (result.eresult == Steam.EResult.AccountLogonDenied) {
        rl.resume();
        rl.question("Steam guard code: ", function(answer) {
            authCode  = answer;
            steamClient.disconnect();
            steamClient.connect();
            rl.pause();
        });
    } else {
        //add error code handling
    }
});

steamClient.on("error", function(error) {
});

steamUser.on('updateMachineAuth', function(sentry, callback) {
    console.log("sentry saved");
    var file = "./sentry/" + username + ".sentry";
    fs.writeFileSync(file, sentry.bytes);
    callback({sha_file: crypto.createHash('sha1').update(sentry.bytes).digest()});
    console.log("Waiting for steam to accept the new sentry...");
    setTimeout(function(){
        steamClient.connect();
    },5000);
});