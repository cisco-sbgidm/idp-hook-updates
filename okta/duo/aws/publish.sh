#!/usr/bin/env bash

function log () {
    echo $(date +"[%F %R:%S] ") "$@";
}

function fail () {
    log "ERROR $@, exiting."; exit 1;
}

function checkVariable() {
    local variable="$1"
    local variable_name="$2"
    if [ -z "$variable" ]; then
        fail  "variable "$variable_name" is not defined"
    fi
}

function usage()
{
    echo "idp hook okta-duo-aws package, Security Business Group, Cisco Systems"
    echo "Usage: $0 --awsAccessKeyid [string] --awsSecretAccessKey [string] --awsRegion [string] --applicationPrefix [string] --s3BucketName [string] --oktaEndpoint [string] --oktaApiToken [string] --duoEndpoint [string] --ikey [string] --skey [string]"
    echo ""
    echo "  Where:"
    echo "    command              comand to run, can be either 'configure'(first time setup) or 'update'(upgrade)"
    echo "    awsAccessKeyid       aws access key id"
    echo "    awsSecretAccessKey   aws access key"
    echo "    awsRegion            region where application will be deployed"
    echo "    s3BucketName         existing bucket name, where terraform state will be stored"
    echo "    applicationPrefix    string that will be used in names of AWS resources"
    echo "    oktaEndpoint         Okta Api endpoint(https://something/api/v1) "
    echo "    oktaApiToken         Okta Api Token, optional for update"
    echo "    duoEndpoint          Duo api host( https://something.duosecurity.com)"
    echo "    ikey                 Duo Admin Api integration key, optional for update"
    echo "    skey                 Duo Admin Api secret key, optional for update"

    echo ""
}

if [[ "$1" == "" ]]; then
    usage
    exit 0
fi

while [ "$1" != "" ]; do
    PARAM="$1"
    VALUE="$2"
    case $PARAM in
        -h | --help | "")
            usage
            exit 0
            ;;
        --command)
            command=$VALUE
            ;;
        --awsAccessKeyid)
            awsAccessKeyid=$VALUE
            ;;
        --awsSecretAccessKey)
            awsSecretAccessKey=$VALUE
            ;;
        --awsRegion)
            awsRegion=$VALUE
            ;;
        --s3BucketName)
            s3BucketName=$VALUE
            ;;
        --applicationPrefix)
            applicationPrefix=$VALUE
            ;;
        --oktaEndpoint)
            oktaEndpoint=$VALUE
            ;;
        --oktaApiToken)
            oktaApiToken=$VALUE
            ;;
         --duoEndpoint)
            duoEndpoint=$VALUE
            ;;
        --ikey)
            ikey=$VALUE
            ;;
        --skey)
            skey=$VALUE
            ;;
        *)
            log "ERROR: unknown parameter $PARAM"
            usage
            exit 1
            ;;
    esac
    shift 2
done

checkVariable "${command}" "command"
checkVariable "${awsAccessKeyid}" "awsAccessKeyid"
checkVariable "${awsSecretAccessKey}" "awsSecretAccessKey"
checkVariable "${awsRegion}" "awsRegion"
checkVariable "${s3BucketName}" "s3BucketName"
checkVariable "${applicationPrefix}" "applicationPrefix"
checkVariable "${oktaEndpoint}" "oktaEndpoint"
checkVariable "${duoEndpoint}" "duoEndpoint"

export AWS_ACCESS_KEY_ID="${awsAccessKeyid}"
export AWS_SECRET_ACCESS_KEY="${awsSecretAccessKey}"

TOP_DIR=$(dirname "$0")
cd "${TOP_DIR}/okta/duo/aws"

if [ "${command}" == "update" ]; then
    node scripts/update.js --applicationPrefix "${applicationPrefix}" --awsRegion "${awsRegion}" \
        --s3BucketName "${s3BucketName}" --oktaEndpoint "${oktaEndpoint}" --duoEndpoint "${duoEndpoint}"
elif [ "${command}" == "configure" ]; then
    checkVariable "${oktaApiToken}" "oktaApiToken"
    checkVariable "${ikey}" "ikey"
    checkVariable "${skey}" "skey"
    node scripts/configure.js --applicationPrefix "${applicationPrefix}" --awsRegion "${awsRegion}" --s3BucketName "${s3BucketName}" \
        --oktaEndpoint "${oktaEndpoint}" --oktaApiToken "${oktaApiToken}" --duoEndpoint "${duoEndpoint}" \
        --ikey "${ikey}" --skey "${skey}"
else
    fail "Unknown command ${command}"
fi
