const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/workspaces");

router.use(requireAuth);
router.get("/",        ctrl.list);
router.post("/",       ctrl.create);
router.patch("/:id",   ctrl.rename);
router.delete("/:id",  ctrl.remove);

module.exports = router;
