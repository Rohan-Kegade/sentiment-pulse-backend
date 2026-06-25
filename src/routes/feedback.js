const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/feedback");

router.use(requireAuth);
router.get("/:surveyId",  ctrl.listBySurvey);
router.post("/:surveyId", ctrl.create);

module.exports = router;
