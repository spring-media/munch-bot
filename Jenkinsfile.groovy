#!groovy​

@Library('jenkins-shared-lib') _


node('jenkins-slave-1') {

    useNodeWithVersion("12")

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
                stage ("Terraform - Prod") {}
                                
                return
            }

            stage("Eat MunchBot") {
                withCredentials([
                  [$class       : 'FileBinding',
                   credentialsId: 'npmrc-springmedia-github-packages',
                   variable     : 'NPMRC']
                ]) {
                    sshagent(credentials: ['github-sshkey-ep-tech-user']) {
                        sh 'cp -f $NPMRC .npmrc'
                        sh "mkdir -p ~/.ssh/"
                        sh "ssh-keyscan github.com >> ~/.ssh/known_hosts"

                        sh 'yarn install; yarn run test; yarn run build'
                        
                    }
                }
                
            }

            stage('Terraform - Prod') {
               terraformDeployment("terraform", "base prod")  
            }
        }
    }
}