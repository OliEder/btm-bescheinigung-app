class DateHelper {
    static formatDate(dateString, format = 'de-DE') {
        const date = new Date(dateString);
        return date.toLocaleDateString(format);
    }
    
    static formatDateTime(dateString, format = 'de-DE') {
        const date = new Date(dateString);
        return `${date.toLocaleDateString(format)} ${date.toLocaleTimeString(format)}`;
    }
    
    static addDays(dateString, days) {
        const date = new Date(dateString);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
    
    static subtractDays(dateString, days) {
        return this.addDays(dateString, -days);
    }
    
    static getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1; // Include both start and end day
    }
    
    static isWeekend(dateString) {
        const date = new Date(dateString);
        const day = date.getDay();
        return day === 0 || day === 6;
    }
    
    static getMonthName(dateString, language = 'de-DE') {
        const date = new Date(dateString);
        return date.toLocaleDateString(language, { month: 'long' });
    }
    
    static getWeekday(dateString, language = 'de-DE') {
        const date = new Date(dateString);
        return date.toLocaleDateString(language, { weekday: 'long' });
    }
    
    static getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }
    
    static getCurrentDateTime() {
        return new Date().toISOString();
    }
    
    static isDateInPast(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    }
    
    static isDateInFuture(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
    }
    
    static getDateRange(startDate, endDate) {
        const dates = [];
        const currentDate = new Date(startDate);
        const end = new Date(endDate);
        
        while (currentDate <= end) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    }
}