/* Create teams table */
CREATE TABLE IF NOT EXISTS teams (
    id INT PRIMARY KEY,
    name VARCHAR(20),
    league VARCHAR(20),
    location VARCHAR(20)
);

/* Create players table */
CREATE TABLE IF NOT EXISTS players (
    id INT PRIMARY KEY,
    firstName VARCHAR(20),
    lastName VARCHAR(20),
    age TINYINT
);

/* Create teamHandles table */
CREATE TABLE IF NOT EXISTS teamHandles (
    id INT PRIMARY KEY,
    handleType VARCHAR(5),
    handleText VARCHAR(20),
    teamId INT,
    FOREIGN KEY(teamId) REFERENCES teams(id)
);

/* Create playerHandles table */
CREATE TABLE IF NOT EXISTS playerHandles (
    id INT PRIMARY KEY,
    handleType VARCHAR(5),
    handleText VARCHAR(20),
    playerId INT,
    FOREIGN KEY(playerId) REFERENCES players(id)
);

/* Create previousSearches table
 * This is to store queries so that if an identical query is made in a given
 * time frame, we look it up here instead of querying twitter again. */
CREATE TABLE IF NOT EXISTS previousSearches (
    id INT PRIMARY KEY,
    playerQuery VARCHAR(255),
    teamQuery VARCHAR(255),
    playerAtChecked BOOLEAN,
    playerHashChecked BOOLEAN,
    teamAtChecked BOOLEAN,
    teamHashChecked BOOLEAN,
    keywordChecked BOOLEAN,
    queryTimestamp TIMESTAMP
);

/* Create tweets table */
CREATE TABLE IF NOT EXISTS tweets (
    id INT PRIMARY KEY,
    tweetText VARCHAR(255),
    tweetTimestamp TIMESTAMP,
    previousSearchId INT,
    FOREIGN KEY(previousSearchId) REFERENCES previousSearches(id)
);
