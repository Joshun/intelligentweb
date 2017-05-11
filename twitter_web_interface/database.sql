/* Create teams table */
CREATE TABLE IF NOT EXISTS teams (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(20),
    league VARCHAR(20),
    location VARCHAR(20),
    PRIMARY KEY(id)
);

/* Create players table */
CREATE TABLE IF NOT EXISTS players (
    id INT NOT NULL AUTO_INCREMENT,
    firstName VARCHAR(20),
    lastName VARCHAR(20),
    age TINYINT,
    PRIMARY KEY(id)
);

-- /* Create teamHandles table */
-- CREATE TABLE IF NOT EXISTS teamHandles (
--     id INT NOT NULL AUTO_INCREMENT,
--     handleType VARCHAR(5),
--     handleText VARCHAR(20),
--     teamId INT,
--     FOREIGN KEY(teamId) REFERENCES teams(id),
--     PRIMARY KEY(id)
-- );

-- /* Create playerHandles table */
-- CREATE TABLE IF NOT EXISTS playerHandles (
--     id INT NOT NULL AUTO_INCREMENT,
--     handleType VARCHAR(5),
--     handleText VARCHAR(20),
--     playerId INT,
--     FOREIGN KEY(playerId) REFERENCES players(id),
--     PRIMARY KEY(id)
-- );

/* Create previousSearches table
 * This is to store queries so that if an identical query is made in a given
 * time frame, we look it up here instead of querying twitter again. */
CREATE TABLE IF NOT EXISTS previousSearches (
    id INT NOT NULL AUTO_INCREMENT,
    playerQuery VARCHAR(255),
    teamQuery VARCHAR(255),
    isOrOperator BOOLEAN,
    -- playerAtChecked BOOLEAN,
    -- playerHashChecked BOOLEAN,
    -- playerKeywordChecked BOOLEAN,
    -- teamAtChecked BOOLEAN,
    -- teamHashChecked BOOLEAN,
    -- teamKeywordChecked BOOLEAN,
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
    FOREIGN KEY(previousSearchId) REFERENCES previousSearches(id),
    PRIMARY KEY(id)
) CHARACTER SET='utf8mb4';
