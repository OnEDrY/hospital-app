
CREATE TABLE `hospitalbd`.`userdata`
(
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
    `userid` INT NOT NULL,
    `fullname` TEXT NOT NULL, 
    `doctorid` INT NOT NULL, 
    `diagnosis` VARCHAR(1024) DEFAULT 'Диагноз не установлен', 
    `discharge` DATETIME
)
ENGINE = InnoDB;