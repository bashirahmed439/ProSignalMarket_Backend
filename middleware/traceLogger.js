const TraceLog = require('../models/TraceLog');

const traceLogger = async (req, res, next) => {
    const start = Date.now();

    // Create a copy of the request body to avoid modifying it
    const bodyCopy = { ...req.body };
    // Remove sensitive fields
    if (bodyCopy.password) bodyCopy.password = '******';

    // Capture the original res.send to intercept the response body
    const oldSend = res.send;
    res.send = function (data) {
        res.locals.responseBody = data;
        return oldSend.apply(res, arguments);
    };

    res.on('finish', async () => {
        try {
            let responseBodyParsed;
            try {
                responseBodyParsed = res.locals.responseBody ? JSON.parse(res.locals.responseBody) : null;
                // Mask password in response if it exists (e.g. login response might echo it, though it shouldn't)
                if (responseBodyParsed && responseBodyParsed.password) responseBodyParsed.password = '******';
            } catch (e) {
                responseBodyParsed = res.locals.responseBody;
            }

            const log = new TraceLog({
                requestedBy: req.user ? req.user.userId : null,
                method: req.method,
                url: req.originalUrl || req.url,
                query: req.query,
                params: req.params,
                requestBody: bodyCopy,
                responseBody: responseBodyParsed,
                statusCode: res.statusCode,
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                imei: req.headers['x-imei'] || req.headers['imei'],
                userAgent: req.headers['user-agent'],
                timestamp: new Date()
            });

            await log.save();
        } catch (error) {
            console.error('Error saving trace log:', error);
        }
    });

    next();
};

module.exports = traceLogger;
