import { LoggerFactoryOptions, LFService, LogGroupRule, LogLevel, LogFormat, DateFormat } from 'typescript-logging';

let logLevel = LogLevel.Info;
if (parseInt(process.env.LogLevel) in LogLevel) {
    logLevel = parseInt(process.env.LogLevel);
}

/**
 * Logger factory
 */
export const factory = LFService.createLoggerFactory(
    new LoggerFactoryOptions().addLogGroupRule(
        new LogGroupRule(
            new RegExp(".+"), // regular expression, what mataches for logger names for this group
            logLevel,
            new LogFormat(
                new DateFormat(), // date format for the log
                false, // show timestamp - false as Lambda function logs timestamp by default
                true // show the logger name
            )
        )
    )
);
