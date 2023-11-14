import { Kafka, logLevel } from 'kafkajs';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import nodemailer from 'nodemailer';

const generatePDF = async (data: any, filePath: string): Promise<void> => {
    try {
      console.log(" pdf generator called");
      const templatePath = path.join(__dirname, 'templates', 'transaction_template.ejs');
      console.log(templatePath, "kafka path print");
      const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
  
      const renderedHtml = ejs.render(htmlTemplate, { data });
  
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
  
      await page.setContent(renderedHtml);
  
      await page.pdf({
        path: filePath,
        format: 'Letter',
      });
  
      await browser.close();
  
      console.log('PDF generated successfully.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'deepudua710@gmail.com',
      pass: 'nzcimpkmswmscvgl',
    },
  });

  const templateSource = fs.readFileSync('/home/admin446/Desktop/stock_market_app/order-management/src/utils/templates/transaction_template.ejs', 'utf-8');
  const template = handlebars.compile(templateSource);
  const html = template({ subject, text });

  const mailOptions = {
    from: 'deepudua710@gmail.com',
    to: 'deepak.dua@appinventiv.com',
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
  console.log('Email sent successfully.');
};

class KafkaConsumer {
  async startConsumer() {
    const kafka = new Kafka({
      clientId: 'pdf-generator',
      brokers: ['localhost:9092'], 
      logLevel: logLevel.INFO,
    });

    const consumer = kafka.consumer({ groupId: 'pdf-consumer-group' });

    await consumer.connect();

    const transactionTopic = 'transaction';

    await consumer.subscribe({ topic: transactionTopic, fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const transactionData = JSON.parse(message.value.toString());

        const pdfFilePath = `./transaction_${transactionData.userId}_${Date.now()}.pdf`;
        await generatePDF(transactionData, pdfFilePath);
        console.log(transactionData);

        const emailSubject = 'Transaction Details';
        const emailText = 'Please find attached the transaction details.';
        await sendEmail('deepak.dua@appinventiv.com', emailSubject, emailText);

        fs.unlinkSync(pdfFilePath);
      },
    });
  }
}

const kafkaConsumer = new KafkaConsumer();
kafkaConsumer.startConsumer();
