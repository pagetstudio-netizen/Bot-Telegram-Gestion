import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import groupsRouter from "./groups";
import ownerRouter from "./owner";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botRouter);
router.use(groupsRouter);
router.use(ownerRouter);

export default router;
