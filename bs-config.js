module.exports = {
    server: {
        baseDir: "src"
    },
    middleware: [
        function (req, res, next) {
            if (req.url.includes('uos-detection.insert')) {
                res.writeHead(204); // No Content
                return res.end();
            }
            next();
        }
    ]
};
