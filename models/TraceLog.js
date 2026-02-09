const mongoose = require('mongoose');

const traceLogSchema = new mongoose.Schema({
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    method: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    query: {
        type: Object
    },
    params: {
        type: Object
    },
    requestBody: {
        type: Object
    },
    responseBody: {
        type: Object
    },
    statusCode: {
        type: Number
    },
    ip: {
        type: String
    },
    imei: {
        type: String
    },
    userAgent: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('TraceLog', traceLogSchema);
