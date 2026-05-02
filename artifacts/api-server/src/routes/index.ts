import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import groupsRouter from "./groups";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botRouter);
router.use(groupsRouter);

export default router;
