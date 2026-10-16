#!/bin/sh

# 复制项目的文件到对应docker路径，便于一键生成镜像。
usage() {
	echo "Usage: sh copy.sh"
	exit 1
}


# copy jar
echo "begin"
npm install



cd device
echo "===============> begin build device "
docker build --no-cache --platform linux/amd64 . -t registry.cn-shanghai.aliyuncs.com/testfala/device:v1.0.0

echo 登录docker!
echo 123abcd, | docker login --username=neglo.lee@gmail.com registry.cn-shanghai.aliyuncs.com --password-stdin

#---------

echo "===============> begin push device "
docker push registry.cn-shanghai.aliyuncs.com/testfala/device:v1.0.0
