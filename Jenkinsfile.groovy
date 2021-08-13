#!groovy​

@Library('jenkins-shared-lib') _


node('slave-node8') {
    ansiColor('xterm') {
        shouldBuildSkip = false
        def isMaster = "master" == env.BRANCH_NAME
        def isPR = !!env.CHANGE_ID

        if (!isMaster && !isPR) {
            stage('Skip build') {
                printout "Skipping Build of branch $env.BRANCH_NAME: Neither master nor PR."
                currentBuild.result = 'SUCCESS'
            }
            return
        }

        stage('Git checkout') {
            def scmVars = checkout scm

            shouldBuildSkip = shouldBuildAbort(scmVars)

            if (shouldBuildSkip) {
                printout "Skipping Build of branch $env.BRANCH_NAME"
                currentBuild.result = 'SUCCESS'
                stage ("Eat MunchBot") {}
                stage ("Terraform - Dev") {}
                                
                return
            }

            stage("Eat MunchBot") {
                withCredentials([
                    [$class       : 'StringBinding',
                     credentialsId: 'slack_token',
                     variable     : 'slackToken']
                ]) {
                    sshagent(credentials: ['8e47ac18-bd2c-4a68-b980-9ed2e624ac91']) {
                        sh "mkdir -p ~/.ssh/"
                        sh "ssh-keyscan github.com >> ~/.ssh/known_hosts"

                        sh 'yarn install; yarn run test; yarn run build'
                        
                    }
                }
            }

            stage('Terraform - Dev') {
                appsToBuild.each {
                    terraformDeployment("$it/terraform", "base dev")
                }  
            }

            stash name: 'modules', includes: appsToBuild.join("/,") + "/"
        }
    }
}


stage('Prod Deploy?') {
    if (!shouldBuildSkip && "master" == env.BRANCH_NAME) {
        echo "Hey Mr. Dev, are you doing all right?"

        timeout(time: 1, unit: 'DAYS') {
            input 'Continue?'
        }
    }
}

node('slave-node8') {

    if (shouldBuildSkip || "master" != env.BRANCH_NAME) {
        printout "Building Branch $env.BRANCH_NAME successfully!!"
        currentBuild.result = 'SUCCESS'
        return
    }

    unstash 'modules'

    stage('Terraform - Prod') {
        terraformDeployment("$it/terraform", "base prod")
    }

}