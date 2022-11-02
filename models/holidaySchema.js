const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
const holidaySchema = mongoose.Schema({
    date: {
        type: String
    },
    timeSlots: [
        {
            time: {
                type: String
            },
            isActive: {
                type: Boolean,
                default: false
            }
        }
    ],
    isFullHoliday: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("holiday", holidaySchema);