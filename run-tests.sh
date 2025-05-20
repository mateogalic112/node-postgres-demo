# run-tests.sh
docker-compose -f docker-compose.test.yml up -d
sleep 5 # optional: wait for DB
NODE_ENV=test npx jest
docker-compose -f docker-compose.test.yml down