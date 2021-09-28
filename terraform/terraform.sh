#!/bin/bash


usage() {
    cat << EOF
usage ./terraform.sh TASK DIR STAGE
    TASK:  plan, apply, destroy
    DIR:   base directory for terraform call
    STAGE: stage name ("dev", "prod")
EOF
}

if [ "x$1" == "x" ]; then
    usage; exit 1;
else
    TASK=$1
fi

if [ "x$2" == "x" ]; then
    usage; exit 1;
else
    DIR=$2
fi

if [ "x$3" == "x" ]; then
    usage; exit 1;
else
    STAGE=$3
fi



# determine the binary
# (usually simple "terraform", but on jenkins "terraform1")
TF=terraform
which terraform1 && TF=terraform1
$TF version


cd $DIR
$TF init
$TF get -update=true

# Test, if the desired workspace (=stage) already exists - otherwise create it:
$TF workspace list | grep -q $STAGE || $TF workspace new $STAGE
$TF workspace select $STAGE

if [ "$TASK" == "plan" ] || [ "$TASK" == "apply" ]; then
    # "terraform plan" with "-detailed-exitcode" returns "2" in case of changes (which is no error).
    # To avoid an interrupt, we set "+e" (don't exit if a command returns > 0) for the next command:
    set +e
    $TF plan -detailed-exitcode
    exitcode=$?
    set -e
    [ $exitcode -eq 1 ] && echo "Error during terraform plan!" && exit 1
    [ $exitcode -eq 2 ] && echo "Changes detected"
fi

if [ "$TASK" == "apply" ]; then
    $TF apply -auto-approve
fi

if [ "$TASK" == "destroy" ]; then
    set +e
    $TF plan --destroy -detailed-exitcode
    set -e
    [ $? -eq 1 ] && echo "Error during terraform plan destroy!" && exit 1
    $TF destroy
fi
