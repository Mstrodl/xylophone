const lxc = require("lxc")()

module.exports = class ContainerManager {
  constructor(containerName) {
    this.name = containerName
    this.running = false
    this.template = "ubuntu"
  }

  start() {
    return new Promise((resolve, reject) => {
      lxc.start(this.name, (err, res) => {
        console.log(err,res)
        if(err) return reject(err)
        this.running = true
        lxc.getIP(this.name, (err2, res2) => {
          if(err2) return reject(err2)
          resolve(res)
          this.ip = res2
        })
      })
    })
  }

  execute(command) {
    return new Promise((resolve, reject) => {
      lxc.attach(this.name, `/bin/bash -c "${command}"`, (error, output) => {
        if(error !== null) {
          return reject({
            code: error,
            message: output
          })
        }
        resolve(output)
      })
    })
  }

  async reset() {
    if(this.running) {
      console.log("Stopping...")
      await this.stop()
    }
    try {
      console.log("Destroying...")
      await this.destroy()
    } catch(e) {}
    console.log("Creating...")
    await this.create(this.template)
    console.log("Starting...")
    await this.start()
    return
  }

  stop() {
    return new Promise((resolve, reject) => {
      lxc.stop(this.name, (err, res) => {
        if(err) return reject(err)
        resolve(res)
        this.running = false
      })
    })
  }

  destroy() {
    return new Promise((resolve, reject) => {
      lxc.destroy(this.name, (err, res) => {
        if(err) return reject(err)
        resolve(res)
        this.running = false
      })
    })
  }

  create(template) {
    return new Promise((resolve, reject) => {
      lxc.create(this.name, template, (err, res) => {
        console.log(err, res)
        if(err) return reject(err)
        resolve(res)
      })
      // lxc-create doesn't always return our CB
      setTimeout(() => resolve(), 5000)
    })
  }
}
