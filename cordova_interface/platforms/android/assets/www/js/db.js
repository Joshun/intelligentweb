var db = window.openDatabase("football", "1.0", "Football database", 2*1024*1024);


function createTables() {
    db.transaction(function(tx) {
        tx.executeSql()
    });
}