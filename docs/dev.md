## git
> 生产环境直接与远程git仓库同步即可
```shell
cd /path/to/koishi
cd ./external/koishi-plugin-awa-quote-image
git clone git@gitee.com:vincent-zyu/koishi-plugin-awa-quote-image.git
git pull origin
git reset --hard origin/master
cd ..
yarn && yarn build
yarn start
```