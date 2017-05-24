var flags = {
	verbose: false
};

/**
 * Checks server arguments for flags, if any.
 */
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

/**
 * Displays DEBUG text; intended for use to hide full information during
 * normal operation of the server.
 */
function debug() {
  if(!flags.verbose) return; // only runs if -v or --verbose are active flags.

  if(arguments) {
    process.stdout.write('[DEBUG] ');
    console.log.apply(console, arguments);
  }
  else {
    console.log();
  }
}

/**
 * Displays INFO text; intended to display useful information during normal
 * operation of the server.
 */
function info() {
  if(arguments) {
    process.stdout.write('[INFO]  ');
    console.info.apply(console, arguments);
  }
  else {
    console.info();
  }
}

/**
 * Displays WARN text; intended to display warnings about certain non-fatal
 * issues during normal operation of the server.
 */
function warn() {
  if(arguments) {
    process.stdout.write('[WARN]  ');
    console.warn.apply(console, arguments);
  }
  else {
    console.warn();
  }
}

/**
 * Displays ERROR text; intended to display warnings about fatal or unintended
 * issues during normal operation of the server.
 */
function error() {
  if(arguments) {
    process.stderr.write('[ERROR] ');
    console.error.apply(console, arguments);
  }
  else {
    console.error();
  }
}

module.exports = {
	flags: flags,

	debug: debug,
	info:  info,
	warn:  warn,
	error: error
}