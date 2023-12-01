import * as puppeteer from 'puppeteer';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as ejs from 'ejs';
import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service'; 
import config from 'src/common/config.common';
import path from 'path';

@Injectable()
export class KafkaConsumerService {
  constructor(private readonly kafkaService: KafkaService) {}

  async startConsumer() {
    const consumer = this.kafkaService.getConsumer(); 

    consumer.subscribe({ topic: 'transaction' }); 

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const transactionData = JSON.parse(message.value.toString());
        await this.generatePDFAndSendEmail(transactionData);
      },
    });
  }

  async generatePDFAndSendEmail(transactionData: any) {
    try {
      const pdfPath = await this.generatePDF(transactionData);

      await this.sendEmailWithAttachment(transactionData.email, pdfPath);
    } catch (error) {
      console.error('Error generating PDF and sending email:', error);
    }
  }

  async generatePDF(transactionData: any): Promise<string> {
    const templatePath = path.join(__dirname, 'utils', 'templates', 'transaction_template.ejs');
    const renderedHTML = await ejs.renderFile(templatePath, { data: transactionData });

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(renderedHTML);
    const pdfPath = path.join(path.join(__dirname, 'Desktop', 'pdfs', `transaction_${transactionData.id}.pdf`));
    await page.pdf({ path: pdfPath, format: 'A4' });
    await browser.close();
    return pdfPath;
  }

  async sendEmailWithAttachment(email: string, pdfPath: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: config.EMAIL,
        pass: config.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: config.EMAIL,
      to: 'deepak.dua@appinventiv.com',
      subject: 'Transaction Details',
      text: 'Please find attached transaction details',
      attachments: [{ path: pdfPath }],
    };

    await transporter.sendMail(mailOptions);
  }
}
