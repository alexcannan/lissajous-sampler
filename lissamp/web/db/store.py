"""
db store for lissajous.space mongodb
"""

import asyncio
import os
import random
import string

from motor.motor_asyncio import AsyncIOMotorClient

from lissamp.logger import logger


class Store:
    client: AsyncIOMotorClient
    b64alphabet: str = string.ascii_letters + string.digits + '_-'
    assert len(b64alphabet) == 64

    def __init__(self):
        connection_string = os.environ.get("LISSAMP_MONGO", "mongodb://localhost/lissamp")
        self.client = AsyncIOMotorClient(connection_string)
        self.db = self.client.get_default_database()
        logger.info(f"Store connected to {self.db}")

    async def count_shares(self):
        async for doc in self.db.shares.find():
            print(doc)
        return

    async def sharecode_exists(self, sharecode: str) -> bool:
        return bool(await self.db.shares.find_one({'code': sharecode}))

    async def request_new_sharecode(self, n_chars: int = 9) -> str:
        """ generates an unused sharecode """
        def _generate():
            return "".join(random.sample(self.b64alphabet, n_chars))
        code = _generate()
        while await self.sharecode_exists(code):
            code = _generate()
        return code

    async def make_sharecode(self, x_freq: int, y_freq: int, samples: int, color: str):
        """ finds existing sharecode if it exists, otherwise makes a new one """
        return


if __name__ == "__main__":
    async def main():
        store = Store()
        await store.count_shares()
        code = await store.request_new_sharecode()
        print(code)

    asyncio.run(main())