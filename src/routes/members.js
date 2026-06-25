const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/members");

router.use(requireAuth);
router.get("/workspace/:workspaceId",    ctrl.list);
router.post("/workspace/:workspaceId",   ctrl.invite);
router.patch("/:memberId",               ctrl.update);
router.delete("/:memberId",              ctrl.remove);

module.exports = router;
