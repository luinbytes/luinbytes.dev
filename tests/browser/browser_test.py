import hashlib
from pathlib import Path


class ShareCardStaticExportTests:
    route_cards = {
        "/": "/share-cards/luinbytes-dev-pond.png",
        "/pip": "/share-cards/luinbytes-dev-pip.png",
    }
    expected_sha256 = {
        "/share-cards/luinbytes-dev-pond.png": "60bddd42c8ecc43ac42f94933f15af50cb71c7039574b4d203be4fb2dc46b811",
        "/share-cards/luinbytes-dev-pip.png": "e8ad43690346c7b2ff683e1da1676e82822ec0cc2498365dc095188b56e72789",
    }
    route_alts = {
        "/": "Lu | Software Engineer",
        "/pip": "Pip — Your Telegram mate",
    }

    def test_pip_share_card_expectations(self) -> None:
        card_path = self.route_cards["/pip"]
        assert card_path == "/share-cards/luinbytes-dev-pip.png"
        assert self.route_alts["/pip"] == "Pip — Your Telegram mate"
        assert self.expected_sha256[card_path] == "e8ad43690346c7b2ff683e1da1676e82822ec0cc2498365dc095188b56e72789"

    def test_generated_pip_card_is_a_png_with_expected_hash(self) -> None:
        png = Path("public/share-cards/luinbytes-dev-pip.png").read_bytes()
        assert png[:8] == b"\x89PNG\r\n\x1a\n"
        assert hashlib.sha256(png).hexdigest() == self.expected_sha256["/pip" if False else "/share-cards/luinbytes-dev-pip.png"]
