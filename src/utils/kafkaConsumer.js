"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var kafkajs_1 = require("kafkajs");
var ejs_1 = require("ejs");
var fs_1 = require("fs");
var path_1 = require("path");
var puppeteer_1 = require("puppeteer");
var handlebars_1 = require("handlebars");
var nodemailer_1 = require("nodemailer");
var generatePDF = function (data, filePath) { return __awaiter(void 0, void 0, void 0, function () {
    var templatePath, htmlTemplate, renderedHtml, browser, page, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                templatePath = path_1.default.join(__dirname, 'templates', 'transaction_template.ejs');
                htmlTemplate = fs_1.default.readFileSync(templatePath, 'utf-8');
                renderedHtml = ejs_1.default.render(htmlTemplate, { data: data });
                return [4 /*yield*/, puppeteer_1.default.launch()];
            case 1:
                browser = _a.sent();
                return [4 /*yield*/, browser.newPage()];
            case 2:
                page = _a.sent();
                // Set content of the page to the rendered HTML
                return [4 /*yield*/, page.setContent(renderedHtml)];
            case 3:
                // Set content of the page to the rendered HTML
                _a.sent();
                // Generate PDF from the rendered HTML
                return [4 /*yield*/, page.pdf({
                        path: filePath,
                        format: 'Letter',
                    })];
            case 4:
                // Generate PDF from the rendered HTML
                _a.sent();
                // Close Puppeteer browser
                return [4 /*yield*/, browser.close()];
            case 5:
                // Close Puppeteer browser
                _a.sent();
                console.log('PDF generated successfully.');
                return [3 /*break*/, 7];
            case 6:
                error_1 = _a.sent();
                console.error('Error generating PDF:', error_1);
                throw error_1;
            case 7: return [2 /*return*/];
        }
    });
}); };
var sendEmail = function (to, subject, text) { return __awaiter(void 0, void 0, void 0, function () {
    var transporter, templateSource, template, html, mailOptions;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                transporter = nodemailer_1.default.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'deepudua710@gmail.com',
                        pass: 'nzcimpkmswmscvgl',
                    },
                });
                templateSource = fs_1.default.readFileSync('path/to/email-template.html', 'utf-8');
                template = handlebars_1.default.compile(templateSource);
                html = template({ subject: subject, text: text });
                mailOptions = {
                    from: 'deepudua710@gmail.com',
                    to: 'deepak.dua@appinventiv.com',
                    subject: subject,
                    html: html,
                };
                return [4 /*yield*/, transporter.sendMail(mailOptions)];
            case 1:
                _a.sent();
                console.log('Email sent successfully.');
                return [2 /*return*/];
        }
    });
}); };
var KafkaConsumer = /** @class */ (function () {
    function KafkaConsumer() {
    }
    KafkaConsumer.prototype.startConsumer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var kafka, consumer, transactionTopic;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        kafka = new kafkajs_1.Kafka({
                            clientId: 'pdf-generator',
                            brokers: ['localhost:9092'],
                            logLevel: kafkajs_1.logLevel.INFO,
                        });
                        consumer = kafka.consumer({ groupId: 'pdf-consumer-group' });
                        return [4 /*yield*/, consumer.connect()];
                    case 1:
                        _a.sent();
                        transactionTopic = 'transaction-topic';
                        return [4 /*yield*/, consumer.subscribe({ topic: transactionTopic, fromBeginning: true })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, consumer.run({
                                eachMessage: function (_a) {
                                    var topic = _a.topic, partition = _a.partition, message = _a.message;
                                    return __awaiter(_this, void 0, void 0, function () {
                                        var transactionData, pdfFilePath, emailSubject, emailText;
                                        return __generator(this, function (_b) {
                                            switch (_b.label) {
                                                case 0:
                                                    transactionData = JSON.parse(message.value.toString());
                                                    pdfFilePath = "./transaction_".concat(transactionData.userId, "_").concat(Date.now(), ".pdf");
                                                    return [4 /*yield*/, generatePDF(transactionData, pdfFilePath)];
                                                case 1:
                                                    _b.sent();
                                                    emailSubject = 'Transaction Details';
                                                    emailText = 'Please find attached the transaction details.';
                                                    return [4 /*yield*/, sendEmail('recipient@example.com', emailSubject, emailText)];
                                                case 2:
                                                    _b.sent();
                                                    fs_1.default.unlinkSync(pdfFilePath);
                                                    return [2 /*return*/];
                                            }
                                        });
                                    });
                                },
                            })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return KafkaConsumer;
}());
var kafkaConsumer = new KafkaConsumer();
kafkaConsumer.startConsumer();
