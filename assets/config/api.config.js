const API_CONFIG = Object.freeze({

    // Google Apps Script Web App URL
    baseURL: "https://script.google.com/macros/s/AKfycbzwpGFk2VCisQuRZHbkWdmqmXkgm-1lid3thl_Me0PiOdNtKI8Ui-bfBj9YS1RQPumJ/exec",

    // API Version
    version: "v1",

    // Request timeout (milliseconds)
    timeout: 30000,

    // Default Headers
    // ملحوظة: Apps Script Web Apps مش بترد على CORS preflight (OPTIONS).
    // باستخدام "text/plain" بدل "application/json" بنتجنب الـ preflight
    // request من المتصفح، والباك إند برضه بيقرا الـ body كـ JSON عادي
    // (e.postData.contents) مهما كان الـ header.
    headers: {
        "Content-Type": "text/plain;charset=utf-8"
    },

    // Retry failed requests
    retry: {
        enabled: true,
        maxAttempts: 3,
        delay: 1000
    }

});

export default API_CONFIG;