const router = require("express").Router();
const ctrl = require("../controllers/public");

router.get("/:surveyId",           ctrl.getSurvey);
router.post("/:surveyId/respond",  ctrl.submitResponse);

module.exports = router;
