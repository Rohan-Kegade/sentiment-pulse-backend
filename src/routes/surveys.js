const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/surveys");

router.use(requireAuth);
router.get("/workspace/:workspaceId", ctrl.listByWorkspace);
router.post("/",       ctrl.create);
router.put("/:id",     ctrl.update);
router.delete("/:id",  ctrl.remove);

module.exports = router;
