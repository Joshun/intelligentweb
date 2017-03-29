CREATE TABLE IF NOT EXISTS teams (
    id INT PRIMARY KEY,
    name VARCHAR(20),
    league VARCHAR(20),
    location VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS players (
    id INT PRIMARY KEY,
    firstName VARCHAR(20),
    lastName VARCHAR(20),
    age TINYINT
);

CREATE TABLE IF NOT EXISTS teamHandles (
    id INT PRIMARY KEY,
    handleType VARCHAR(5),
    handleText VARCHAR(20),
    teamId INT,
    FOREIGN KEY(teamId) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS playerHandles (
    id INT PRIMARY KEY,
    handleType VARCHAR(5),
    handleText VARCHAR(20),
    playerId INT,
    FOREIGN KEY(playerId) REFERENCES players(id)
);