import { Router } from "express";
import {
    inviteWorkspaceMember,
    checkInvitationToken,
    getEmailInvitationList
} from "../controller/inviteWorkspace.js";
import { verifyJWT } from "../middlewares/auth.js";



const route = Router()


route.post("/invite", verifyJWT, inviteWorkspaceMember)
route.get("/check-invitation-token", checkInvitationToken)
route.get("/get-email-invitation-list", verifyJWT, getEmailInvitationList)

// route.post("check-email-valid", verifyJWT, checkEmailValid)


export default route