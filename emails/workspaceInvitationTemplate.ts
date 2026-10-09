interface EmailProps {
    username: string;
    workspaceName: string;
    invitedBy: string;
    inviteLink: string;
}

export const workspaceInvitationTemplate = ({
    username,
    workspaceName,
    invitedBy,
    inviteLink,
}: EmailProps): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You're invited to TaskFlow</title>
</head>

<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:14px;padding:40px;box-shadow:0 10px 30px rgba(0,0,0,.08);">

<tr>
<td align="center">

<h1 style="margin:0;color:#2563eb;">
TaskFlow
</h1>

<p style="color:#777;margin-top:8px;">
Work smarter. Together.
</p>

</td>
</tr>

<tr>
<td style="padding-top:35px;">

<h2 style="margin:0;color:#222;">
Hi ${username},
</h2>

<p style="margin-top:18px;font-size:16px;line-height:28px;color:#555;">

<strong>${invitedBy}</strong> invited you to collaborate in the workspace

<strong>${workspaceName}</strong>.

</p>

</td>
</tr>

<tr>
<td align="center" style="padding:35px 0;">

<a href="${inviteLink}"
style="
display:inline-block;
padding:15px 35px;
background:#2563eb;
color:#ffffff;
text-decoration:none;
font-size:16px;
font-weight:bold;
border-radius:8px;
">
Join Workspace
</a>

</td>
</tr>

<tr>
<td>

<p style="font-size:15px;color:#555;">
Or copy and paste this link into your browser:
</p>

<p style="word-break:break-all;color:#2563eb;">
${inviteLink}
</p>

</td>
</tr>

<tr>
<td style="padding-top:20px;">

<p style="font-size:15px;color:#555;">
This invitation will expire in <strong>7 days</strong>.
</p>

<p style="font-size:15px;color:#555;">
If you weren't expecting this invitation, you can safely ignore this email.
</p>

</td>
</tr>

<tr>
<td style="padding-top:30px;border-top:1px solid #eee;">

<p style="margin:0;color:#999;font-size:13px;text-align:center;">
© ${new Date().getFullYear()} TaskFlow
</p>

<p style="margin-top:10px;color:#aaa;font-size:12px;text-align:center;">
Built for teams to manage workspaces, projects and tasks efficiently.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};