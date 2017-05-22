
/* Create previousSearches table
 * This is to store queries so that if an identical query is made in a given
 * time frame, we look it up here instead of querying twitter again. */
CREATE TABLE IF NOT EXISTS previousSearches (
    id INT NOT NULL AUTO_INCREMENT,
    playerQuery VARCHAR(255),
    teamQuery VARCHAR(255),
    isOrOperator BOOLEAN,
    queryTimestamp TIMESTAMP,
    PRIMARY KEY(id)
);

/* Create tweets table */
CREATE TABLE IF NOT EXISTS tweets (
    id INT NOT NULL AUTO_INCREMENT,
    userName VARCHAR(255),
    tweetId VARCHAR(255),
    tweetText VARCHAR(255),
    tweetTimestamp TIMESTAMP,
    previousSearchId INT,
    -- FOREIGN KEY(previousSearchId) REFERENCES previousSearches(id),
    PRIMARY KEY(id)
) CHARACTER SET='utf8mb4';

/* Create teams table */
CREATE TABLE IF NOT EXISTS teams (
    id INT NOT NULL AUTO_INCREMENT,
    screenName VARCHAR(255) UNIQUE,
    realName VARCHAR(255),
    PRIMARY KEY(id)
);

/* Create players table */
CREATE TABLE IF NOT EXISTS players (
    id INT NOT NULL AUTO_INCREMENT,
    screenName VARCHAR(255) UNIQUE,
    realName VARCHAR(255),
    PRIMARY KEY(id)
);

/* Add sample teams to teams table */
INSERT IGNORE INTO teams (screenName, realName) VALUES ('ManUtd', 'Manchester F.C.');
INSERT IGNORE INTO teams (screenName, realName) VALUES ('ChelseaFC', 'Chelsea F.C.');
INSERT IGNORE INTO teams (screenName, realName) VALUES ('Arsenal', 'Arsenal F.C.');

/* Add sample players to players table */
INSERT IGNORE INTO players (screenName, realName) VALUES ('WayneRooney', 'Wayne Rooney');
INSERT IGNORE INTO players (screenName, realName) VALUES ('Cristiano', 'Christiano Ronaldo');
INSERT IGNORE INTO players (screenName, realName) VALUES ('lionel_official', 'Lionel Messi');

INSERT IGNORE INTO players (screenName, realName) VALUES ('#WayneRooney', 'Wayne Rooney');