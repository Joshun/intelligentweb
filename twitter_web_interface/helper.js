module.exports = {
	info: function(info) {
		console.log(info);
		console.log("\>\> TIME STAMP: " + (new Date()) + " : " +  (new Date().getTime() / 1000 | 0));
	}
}