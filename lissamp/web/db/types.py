from pydantic import BaseModel
from pydantic.color import Color


class Share(BaseModel):
    code: str
    x_freq: int
    y_freq: int
    samples: int
    color: Color


if __name__ == "__main__":
   print(Share.schema_json())