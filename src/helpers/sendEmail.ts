import nodemailer from 'nodemailer';
import { workspaceInvitationTemplate } from '../../emails/workspaceInvitationTemplate.js';
import { ApiError } from '../utils/ApiError.js';
import type { NextFunction, Request, Response } from 'express';


export const sendEmail = async (email: string, inviteLink: string, invitedByEmail?: string, workspaceName?: string) => {
    try {
        const transport = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 465,
            auth: {
                user: process.env.MAIL_EMAIL_ADDRESS!,
                pass: process.env.MAIL_PASSWORD!,
            }
        });

        const mailOptions = {
            from: "Master Private Limited",
            to: email,
            subject: "Workspace Invitation Link",
            html: workspaceInvitationTemplate({
                username: email,
                workspaceName: workspaceName || "TaskFlow Workspace",
                invitedBy: invitedByEmail || "Team",
                inviteLink,
            }),
        }

        return await transport.sendMail(mailOptions);
    } catch (error: any) {
        console.error('Error sending email:', error);
        throw new ApiError(500, error?.message || "Failed to send email");
    }
}