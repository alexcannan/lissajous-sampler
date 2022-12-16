FROM ubuntu:20.04

WORKDIR /app

RUN apt-get update \
    && apt-get -y install \
    python3 python3-pip \
    && apt-get clean

RUN python3 -m pip install --upgrade pip setuptools wheel

COPY setup.py .
COPY gunicorn_conf.py .
COPY lissamp/ lissamp/

RUN python3 -m pip install .

CMD gunicorn -k uvicorn.workers.UvicornWorker -c gunicorn_conf.py lissamp.web.router:app