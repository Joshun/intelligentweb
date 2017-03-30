var flags = {
	verbose: false
}

process.argv.forEach(function(arg) {
  if(arg.match(/^-*/) != '') {
  	switch(arg.substring(1)) {
  	  case 'v': case '-verbose':
  	    flags.verbose = true;
  	    break;
  	  default:
  	    break;
  	}
  }
});

function debug() {
  if(!flags.verbose) return;

  if(arguments) {
    process.stdout.write('[DEBUG] ');
    console.log.apply(console, arguments);
  }
  else {
    console.log();
  }
}

function info() {
  if(arguments) {
    process.stdout.write('[INFO] ');
    console.info.apply(console, arguments);
  }
  else {
    console.info();
  }
}

function warn() {
  if(arguments) {
    process.stdout.write('[WARN] ');
    console.warn.apply(console, arguments);
  }
  else {
    console.warn();
  }
}

function error() {
  if(arguments) {
    process.stderr.write('[ERROR] ');
    console.error.apply(console, arguments);
  }
  else {
    console.error();
  }
}

// console.log("\>\> TIME STAMP: " + (new Date()) + " : " +  (new Date().getTime() / 1000 | 0));

module.exports = {
	flags: flags,

	debug: debug,
	info:  info,
	warn:  warn,
	error: error
}