#!/bin/sh
#curl -k -X POST https://localhost/rest/register -d 'name=kevin&email=kevin_chang@gemtek.com&password=test'
#curl -k -X POST  https://localhost/rest/login --digest -u 'kevin_chang@gemtek.com:test'
curl -k -X POST  https://localhost/rest/user_update --digest -u 'kevin_chang@gemtek.com:test' -d 'name=kevin&email=kevin_chang@gemtek.com&password=test123&last_name=chang&first_name=kaija'
